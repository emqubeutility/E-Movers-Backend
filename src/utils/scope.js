import { ForbiddenError } from './errors.js';
import { isSuperAdmin } from './roles.js';

/**
 * The organization a caller is limited to.
 *   null    - unrestricted (super administrator on "All organizations", or an internal call)
 *   BigInt  - the caller's active organization id (a super administrator picks it in the menu)
 * Anyone else who is not linked to an organization is refused rather than shown everything.
 */
/**
 * The organization a record is saved in: the one asked for when the caller may work there
 * (a super admin anywhere, others in any of their organizations), else the active one.
 */
export function chosenOrganizationOf(actor, requested) {
  if (requested) {
    const id = String(requested);
    const allowed = !actor || isSuperAdmin(actor) || (actor.orgs ?? []).includes(id);
    if (!allowed) throw new ForbiddenError('You do not work in that organization');
    return BigInt(id);
  }
  return orgScopeOf(actor);
}

export function orgScopeOf(actor) {
  if (!actor) return null;
  if (isSuperAdmin(actor)) return actor.org ? BigInt(actor.org) : null;
  if (!actor.org) throw new ForbiddenError('Your account is not linked to an organization');
  return BigInt(actor.org);
}
