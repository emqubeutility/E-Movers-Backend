import { resolveAddress, toAddressDto } from '../../utils/address.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors.js';
import { requireParameter } from '../../utils/lookups.js';
import { toMeta, toPagination } from '../../utils/pagination.js';

/** Gender, age group and nationality, as codes. */
const personDto = (profile) => ({
  gender: profile.parameter_profile_gender_idToparameter?.code ?? null,
  ageGroup: profile.parameter_profile_age_group_idToparameter?.code ?? null,
  nationality: profile.nationality?.code ?? null,
});

const toContactDto = (profile) => ({
  id: profile.public_id,
  status: profile.status?.code ?? 'ACTIVE',
  name: profile.name,
  email: profile.email ?? null,
  contactNo: profile.contact_no ?? null,
  altContactNo: profile.alt_contact_no ?? null,
  designation: profile.designation ?? null,
  ...personDto(profile),
});

export function toCustomerDto(row) {
  const links = row.customer_profile ?? [];
  const profile = links.find((link) => link.is_master)?.profile ?? {};
  return {
    contacts: links.filter((link) => !link.is_master).map((link) => toContactDto(link.profile)),
    mainContactId: profile.public_id ?? null,
    id: row.public_id,
    code: row.customer_code,
    kind: row.customer_kind,
    name: row.customer_name,
    contactName: profile.name ?? null,
    email: profile.email ?? null,
    contactNo: profile.contact_no ?? null,
    altContactNo: profile.alt_contact_no ?? null,
    designation: profile.designation ?? null,
    ...personDto(profile),
    status: row.parameter_customer_status_idToparameter.code,
    statusLabel: row.parameter_customer_status_idToparameter.label,
    agreedToWhatsapp: row.whatsapp_optin,
    // The customer's address is the main contact's address.
    address: toAddressDto(profile.address_profile_address_idToaddress),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createCustomerService({ customerRepository }) {
  async function getExisting(id) {
    const row = await customerRepository.findByPublicId(id);
    if (!row) throw new NotFoundError('Customer not found');
    return row;
  }

  async function assertCodeFree(code, excludeId) {
    if (await customerRepository.codeExists(code, excludeId)) {
      throw new ConflictError('Customer code is already in use', [
        { field: 'code', message: 'Customer code is already in use' },
      ]);
    }
  }

  // The contact number is unique among customers of the same type (individual or company).
  async function assertContactNoFree(contactNo, kind, excludeId) {
    if (!contactNo) return;
    if (await customerRepository.contactNoTaken(contactNo, kind, excludeId)) {
      const type = kind === 'COMPANY' ? 'company' : 'individual';
      const message = `Another ${type} customer already uses this contact number`;
      throw new ConflictError(message, [{ field: 'contactNo', message }]);
    }
  }

  /**
   * Company customers: every contact person's number (main included) is unique across all
   * company customers' contact persons, and within this company.
   */
  async function assertCompanyContactNosFree(mainNo, contacts, excludeId) {
    const entries = [
      { field: 'contactNo', number: mainNo },
      ...contacts.map((contact, index) => ({
        field: `contacts.${index}.contactNo`,
        number: contact.contactNo,
      })),
    ].filter((entry) => entry.number);
    const errors = [];
    const seen = new Set();
    for (const entry of entries) {
      if (seen.has(entry.number)) {
        errors.push({ field: entry.field, message: 'Another contact person here has this number' });
      }
      seen.add(entry.number);
    }
    const taken = new Set(await customerRepository.companyContactNosTaken([...seen], excludeId));
    for (const entry of entries) {
      if (taken.has(entry.number)) {
        errors.push({
          field: entry.field,
          message: 'A contact person of another company customer already uses this number',
        });
      }
    }
    if (errors.length) throw new ConflictError('Contact number already in use', errors);
  }

  // The new main contact must be one of this company customer's contact persons.
  function assertMainContact(existing, mainContactId) {
    if (!mainContactId) return;
    const ids = (existing.customer_profile ?? []).map((link) => link.profile.public_id);
    if (existing.customer_kind !== 'COMPANY' || !ids.includes(mainContactId)) {
      throw new BadRequestError(
        'Choose one of this company’s contact persons as the main contact',
        [{ field: 'mainContactId', message: 'Not a contact person of this customer' }],
      );
    }
  }

  // A company's address needs the street line; an individual may give just the country/city.
  function assertAddressComplete(kind, address) {
    if (kind === 'COMPANY' && address && !address.addressText?.trim()) {
      throw new BadRequestError('Enter the address', [
        { field: 'addressText', message: 'Enter the address' },
      ]);
    }
  }

  function assertContactsAllowed(kind, contacts) {
    if (kind !== 'COMPANY' && contacts?.length) {
      throw new BadRequestError('Only a company customer has contact persons', [
        { field: 'contacts', message: 'Only a company customer has contact persons' },
      ]);
    }
  }

  // Dropdown code -> parameter id; '' clears it, undefined leaves it unchanged.
  async function paramOf(type, code, field) {
    if (code === undefined) return undefined;
    if (!code) return null;
    return requireParameter(customerRepository, type, code, field);
  }

  async function nationalityOf(code, field) {
    if (code === undefined) return undefined;
    if (!code) return null;
    const id = await customerRepository.findNationalityId(code);
    if (id === null) {
      throw new BadRequestError('Unknown nationality', [
        { field, message: 'Select a nationality' },
      ]);
    }
    return id;
  }

  // Gender, age group and nationality of one person, by the field prefix used in errors.
  async function personLookups(person, prefix = '') {
    return {
      genderId: await paramOf('GENDER', person.gender, `${prefix}gender`),
      ageGroupId: await paramOf('AGE_GROUP', person.ageGroup, `${prefix}ageGroup`),
      nationalityId: await nationalityOf(person.nationality, `${prefix}nationality`),
    };
  }

  async function resolveLookups(input, defaultStatus) {
    const status = input.status ?? defaultStatus;
    return {
      statusId: status
        ? await requireParameter(customerRepository, 'ACCOUNT_STATUS', status, 'status')
        : undefined,
      // Every person of a customer (individual, main contact, contact persons) is a CUSTOMER profile.
      userTypeId: await requireParameter(customerRepository, 'USER_TYPE', 'CUSTOMER', 'userType'),
      ...(await personLookups(input)),
      contacts:
        input.contacts &&
        (await Promise.all(
          input.contacts.map(async (contact, index) => ({
            ...contact,
            ...(await personLookups(contact, `contacts.${index}.`)),
            // Each contact person has their own status; a new one is active by default.
            statusId: await requireParameter(
              customerRepository,
              'ACCOUNT_STATUS',
              contact.status ?? 'ACTIVE',
              `contacts.${index}.status`,
            ),
          })),
        )),
    };
  }

  return {
    async list(query) {
      const pagination = toPagination(query);
      const { rows, total } = await customerRepository.list({
        ...query,
        skip: pagination.skip,
        take: pagination.take,
      });
      return { items: rows.map(toCustomerDto), meta: toMeta(pagination, total) };
    },

    options() {
      return customerRepository.listOptions();
    },

    async getById(id) {
      return toCustomerDto(await getExisting(id));
    },

    async create(input, actor) {
      if (!input.name && input.kind === 'COMPANY') {
        throw new BadRequestError('A company customer needs a name', [
          { field: 'name', message: 'Enter the company name' },
        ]);
      }
      assertContactsAllowed(input.kind, input.contacts);
      if (input.code) await assertCodeFree(input.code);
      else input = { ...input, code: await customerRepository.nextCode() };
      if (input.kind === 'COMPANY') {
        await assertCompanyContactNosFree(input.contactNo, input.contacts ?? []);
      } else {
        await assertContactNoFree(input.contactNo, input.kind);
      }
      assertAddressComplete(input.kind, input.address);
      const lookups = await resolveLookups(input, 'ACTIVE');
      const address = await resolveAddress(customerRepository, input.address, 'HOME');
      const row = await customerRepository.create({ ...input, ...lookups, address }, actor.uid);
      return toCustomerDto(row);
    },

    async update(id, input, actor) {
      const existing = await getExisting(id);
      assertContactsAllowed(existing.customer_kind, input.contacts);
      assertMainContact(existing, input.mainContactId);
      if (existing.customer_kind === 'COMPANY') {
        // Numbers not sent keep their saved values.
        const links = existing.customer_profile ?? [];
        const saved = links.find((link) => link.is_master)?.profile.contact_no;
        const others = links
          .filter((link) => !link.is_master)
          .map((link) => ({ contactNo: link.profile.contact_no }));
        await assertCompanyContactNosFree(input.contactNo ?? saved, input.contacts ?? others, id);
      } else {
        await assertContactNoFree(input.contactNo, existing.customer_kind, id);
      }
      assertAddressComplete(existing.customer_kind, input.address);
      const lookups = await resolveLookups(input);
      const address = await resolveAddress(customerRepository, input.address, 'HOME');
      const row = await customerRepository.update(id, { ...input, ...lookups, address }, actor.uid);
      return toCustomerDto(row);
    },

    async remove(id, actor) {
      await getExisting(id);
      await customerRepository.softDelete(id, actor.uid);
    },
  };
}
