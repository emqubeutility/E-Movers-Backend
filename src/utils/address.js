import { BadRequestError } from './errors.js';
import { requireParameter } from './lookups.js';

/** One main address kept in the address table; the owner row holds its address_id. */

export const ADDRESS_SELECT = {
  address_text: true,
  postal_code: true,
  country: { select: { country_id: true, name: true } },
  state: { select: { state_id: true, name: true } },
  city: { select: { city_id: true, name: true } },
  area: { select: { area_id: true, name: true } },
};

export const ADDRESS_INPUT = {
  type: 'object',
  additionalProperties: false,
  required: ['countryId', 'addressText'],
  properties: {
    countryId: { type: 'integer', minimum: 1 },
    stateId: { type: 'integer', minimum: 1 },
    cityId: { type: 'integer', minimum: 1 },
    areaId: { type: 'integer', minimum: 1 },
    addressText: { type: 'string', minLength: 1, maxLength: 512 },
    postalCode: { type: 'string', maxLength: 20 },
  },
};

/** Customer address: the street line may be empty (an individual needs only the country). */
export const CUSTOMER_ADDRESS_INPUT = {
  ...ADDRESS_INPUT,
  required: ['countryId'],
  properties: {
    ...ADDRESS_INPUT.properties,
    addressText: { type: 'string', maxLength: 512 },
  },
};

const nullableText = { type: ['string', 'null'] };

export const ADDRESS_RESPONSE = {
  type: ['object', 'null'],
  properties: {
    countryId: { type: 'integer' },
    countryName: { type: 'string' },
    stateId: { type: ['integer', 'null'] },
    stateName: nullableText,
    cityId: { type: ['integer', 'null'] },
    cityName: nullableText,
    areaId: { type: ['integer', 'null'] },
    areaName: nullableText,
    addressText: { type: 'string' },
    postalCode: nullableText,
  },
};

export function toAddressDto(row) {
  if (!row) return null;
  return {
    countryId: row.country.country_id,
    countryName: row.country.name,
    stateId: row.state?.state_id ?? null,
    stateName: row.state?.name ?? null,
    cityId: row.city?.city_id ?? null,
    cityName: row.city?.name ?? null,
    areaId: row.area?.area_id ?? null,
    areaName: row.area?.name ?? null,
    addressText: row.address_text,
    postalCode: row.postal_code,
  };
}

/** Checks the country, state and city, and adds the address type id. `repository` needs the two lookups. */
export async function resolveAddress(repository, address, typeCode) {
  if (address === undefined) return undefined;
  if (!(await repository.countryExists(address.countryId))) {
    throw new BadRequestError('Unknown country', [
      { field: 'countryId', message: 'Select a valid country' },
    ]);
  }
  if (!(await repository.locationIsValid(address))) {
    throw new BadRequestError('The state or city does not belong to the country', [
      { field: 'address', message: 'Choose a state and city that belong to the country' },
    ]);
  }
  const typeId = await requireParameter(repository, 'ADDRESS_TYPE', typeCode, 'address');
  return { ...address, typeId };
}

export function countryExistsIn(prisma) {
  return async (countryId) => {
    const row = await prisma.country.findUnique({
      where: { country_id: countryId },
      select: { country_id: true },
    });
    return Boolean(row);
  };
}

export function locationIsValidIn(prisma) {
  return async ({ countryId, stateId, cityId, areaId }) => {
    // An area belongs to a city, so it needs one.
    if (areaId) {
      if (!cityId) return false;
      const area = await prisma.area.findFirst({
        where: { area_id: areaId, city_id: cityId, is_active: true },
        select: { area_id: true },
      });
      if (!area) return false;
    }
    if (stateId) {
      const state = await prisma.state.findFirst({
        where: { state_id: stateId, country_id: countryId, is_active: true },
        select: { state_id: true },
      });
      if (!state) return false;
    }
    if (cityId) {
      const city = await prisma.city.findFirst({
        where: {
          city_id: cityId,
          country_id: countryId,
          is_active: true,
          ...(stateId && { state_id: stateId }),
        },
        select: { city_id: true },
      });
      if (!city) return false;
    }
    return true;
  };
}

/**
 * Saves the main address of a company or customer and links it through the owner's address_id.
 * `owner` is 'company' or 'customer'. The address table keeps no owner id.
 */
export async function saveMainAddress(tx, owner, ownerId, address, actorId) {
  const ownerKey = `${owner}_id`;
  const current = await tx[owner].findUnique({
    where: { [ownerKey]: ownerId },
    select: { address_id: true },
  });
  const values = {
    country_id: address.countryId,
    state_id: address.stateId ?? null,
    city_id: address.cityId ?? null,
    area_id: address.areaId ?? null,
    // The column is NOT NULL; an individual customer may leave the street line empty.
    address_text: address.addressText ?? '',
    postal_code: address.postalCode || null,
  };
  if (current?.address_id) {
    await tx.address.update({
      where: { address_id: current.address_id },
      data: { ...values, updated_by: actorId },
    });
    return;
  }
  const created = await tx.address.create({
    data: {
      ...values,
      address_type_id: address.typeId,
      is_default: true,
      created_by: actorId,
    },
    select: { address_id: true },
  });
  await tx[owner].update({
    where: { [ownerKey]: ownerId },
    data: { address_id: created.address_id },
  });
}
