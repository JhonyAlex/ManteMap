/** Floor-plan service facade. Domain responsibilities live in focused modules. */
export {
  detectMimeType,
  getFloorPlan,
  getFloorPlanImage,
  listFloorPlans,
  removeFloorPlan,
  uploadFloorPlan,
  validateFileExtension,
  validateFileSize,
} from './floor-plan-plan-service';
export {
  addMarker,
  editMarker,
  getMarker,
  listMarkers,
  removeMarker,
  validateCoordinates,
} from './floor-plan-marker-service';
