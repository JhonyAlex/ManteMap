import {
  ALLOWED_FLOOR_PLAN_EXTENSIONS,
  createFloorPlanSchema,
  MAX_FLOOR_PLAN_SIZE_BYTES,
  type CreateFloorPlanInput,
} from '@mantemap/validation';
import { NotFoundError, ValidationError } from '@mantemap/shared';
import {
  createFloorPlan,
  deleteFloorPlan,
  findFloorPlansByLocation,
  findFloorPlansByProject,
} from '@/lib/repositories/floor-plan-repository';
import { getStorageDriver } from '@/lib/storage';
import { requireProjectMember, requireProjectOwner } from '@/lib/services/project-access-service';
import { requireProjectFloorPlan, requireProjectLocation } from './floor-plan-ownership-service';

const MIME_MAP: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };

export function validateFileExtension(fileName: string): void {
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  if (!ALLOWED_FLOOR_PLAN_EXTENSIONS.includes(extension)) throw new ValidationError(`File extension "${extension}" not allowed. Allowed: ${ALLOWED_FLOOR_PLAN_EXTENSIONS.join(', ')}`);
}

export function validateFileSize(size: number): void {
  if (size > MAX_FLOOR_PLAN_SIZE_BYTES) throw new ValidationError(`File size ${size} bytes exceeds maximum of ${MAX_FLOOR_PLAN_SIZE_BYTES} bytes`);
}

export function detectMimeType(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? 'application/octet-stream' : (MIME_MAP[fileName.slice(dot).toLowerCase()] ?? 'application/octet-stream');
}

export async function uploadFloorPlan(projectId: string, locationId: string, file: File, input: Omit<CreateFloorPlanInput, 'locationId' | 'imageUrl'>, userId: string) {
  await requireProjectOwner(projectId, userId);
  await requireProjectLocation(projectId, locationId);
  validateFileExtension(file.name);
  validateFileSize(file.size);
  const parsed = createFloorPlanSchema.parse({ ...input, locationId, imageUrl: 'placeholder' });
  const storageDriver = getStorageDriver();
  const storagePath = await storageDriver.writeFile(Buffer.from(await file.arrayBuffer()), `${locationId}/${Date.now()}-${file.name}`);
  return { floorPlan: await createFloorPlan(locationId, { name: parsed.name, imageUrl: storagePath, width: parsed.width, height: parsed.height }) };
}

export async function getFloorPlan(projectId: string, floorPlanId: string, userId: string) {
  await requireProjectMember(projectId, userId);
  return { floorPlan: await requireProjectFloorPlan(projectId, floorPlanId) };
}

export async function getFloorPlanImage(projectId: string, floorPlanId: string, userId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  await requireProjectMember(projectId, userId);
  const floorPlan = await requireProjectFloorPlan(projectId, floorPlanId);
  try { return { buffer: await getStorageDriver().readFile(floorPlan.imageUrl), mimeType: detectMimeType(floorPlan.imageUrl) }; }
  catch { throw new NotFoundError('Floor plan image', floorPlanId); }
}

export async function listFloorPlans(projectId: string, locationId: string | null, userId: string) {
  await requireProjectMember(projectId, userId);
  if (locationId) await requireProjectLocation(projectId, locationId);
  return { floorPlans: locationId ? await findFloorPlansByLocation(locationId) : await findFloorPlansByProject(projectId) };
}

export async function removeFloorPlan(projectId: string, floorPlanId: string, userId: string) {
  await requireProjectOwner(projectId, userId);
  const floorPlan = await requireProjectFloorPlan(projectId, floorPlanId);
  try { await getStorageDriver().deleteFile(floorPlan.imageUrl); } catch { /* missing files do not prevent record deletion */ }
  await deleteFloorPlan(floorPlanId);
}
