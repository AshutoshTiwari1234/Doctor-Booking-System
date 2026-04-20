import { 
  getDataConnect, 
  queryRef, 
  mutationRef, 
  executeQuery, 
  executeMutation,
  connectDataConnectEmulator
} from 'firebase/data-connect';

// Connector config (Matches dataconnect.yaml)
export const connectorConfig = {
  connector: "doctor-connector",
  service: "doctor-appointment-7705e-service",
  location: "asia-southeast1",
};

/**
 * HELPER: Get Data Connect instance
 */
let dcInstance = null;
const getDC = () => {
  if (!dcInstance) {
    dcInstance = getDataConnect(connectorConfig);
    
    const isLocalhost = typeof window !== 'undefined' && 
       (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    if (isLocalhost) {
      // Only use emulator if explicitly enabled via env var
      if (import.meta.env.VITE_USE_DATACONNECT_EMULATOR === 'true') {
        console.log("[DataConnect] Connecting to local emulator on port 9399...");
        connectDataConnectEmulator(dcInstance, 'localhost', 9399);
      } else {
        console.log("[DataConnect] Connecting to production Firebase Data Connect...");
      }
    }
  }
  return dcInstance;
};

// ── QUERIES ───────────────────────────────────────────────────
export const listApprovedDoctors = (vars) => executeQuery(queryRef(getDC(), 'ListApprovedDoctors', vars));
export const listDoctorsBySpecialty = (vars) => executeQuery(queryRef(getDC(), 'ListDoctorsBySpecialty', vars));
export const listDoctorsByLocation = (vars) => executeQuery(queryRef(getDC(), 'ListDoctorsByLocation', vars));
export const getDoctorById = (vars) => executeQuery(queryRef(getDC(), 'GetDoctorById', vars));
export const listAllDoctors = (vars) => executeQuery(queryRef(getDC(), 'ListAllDoctors', vars));
export const getDoctorSlots = (vars) => executeQuery(queryRef(getDC(), 'GetDoctorSlots', vars));
export const getAvailableSlots = (vars) => executeQuery(queryRef(getDC(), 'GetAvailableSlots', vars));
export const getMyAppointments = (vars) => executeQuery(queryRef(getDC(), 'GetMyAppointments', vars));
export const getDoctorAppointments = (vars) => executeQuery(queryRef(getDC(), 'GetDoctorAppointments', vars));
export const getTodayAppointments = (vars) => executeQuery(queryRef(getDC(), 'GetTodayAppointments', vars));
export const getAllAppointments = (vars) => executeQuery(queryRef(getDC(), 'GetAllAppointments', vars));
export const getAppointmentStats = (vars) => executeQuery(queryRef(getDC(), 'GetAppointmentStats', vars));
export const getUserByUid = (vars) => executeQuery(queryRef(getDC(), 'GetUserByUid', vars));
export const getAllUsers = (vars) => executeQuery(queryRef(getDC(), 'GetAllUsers', vars));
export const getDoctorReviews = (vars) => executeQuery(queryRef(getDC(), 'GetDoctorReviews', vars));
export const getUnreadNotifications = (vars) => executeQuery(queryRef(getDC(), 'GetUnreadNotifications', vars));
export const getPatientReports = (vars) => executeQuery(queryRef(getDC(), 'GetPatientReports', vars));

// ── MUTATIONS ─────────────────────────────────────────────────
export const createUser = (vars) => executeMutation(mutationRef(getDC(), 'CreateUser', vars));
export const updateUserApproval = (vars) => executeMutation(mutationRef(getDC(), 'UpdateUserApproval', vars));
export const createDoctor = (vars) => executeMutation(mutationRef(getDC(), 'CreateDoctor', vars));
export const seedDoctor = (vars) => executeMutation(mutationRef(getDC(), 'SeedDoctor', vars));
export const approveDoctorByUid = (vars) => executeMutation(mutationRef(getDC(), 'ApproveDoctorByUid', vars));
export const updateDoctorAvailability = (vars) => executeMutation(mutationRef(getDC(), 'UpdateDoctorAvailability', vars));
export const updateDoctorRating = (vars) => executeMutation(mutationRef(getDC(), 'UpdateDoctorRating', vars));
export const addDoctorSlot = (vars) => executeMutation(mutationRef(getDC(), 'AddDoctorSlot', vars));
export const markSlotBooked = (vars) => executeMutation(mutationRef(getDC(), 'MarkSlotBooked', vars));
export const markSlotAvailable = (vars) => executeMutation(mutationRef(getDC(), 'MarkSlotAvailable', vars));
export const deleteSlot = (vars) => executeMutation(mutationRef(getDC(), 'DeleteSlot', vars));
export const bookAppointment = (vars) => executeMutation(mutationRef(getDC(), 'BookAppointment', vars));
export const cancelAppointment = (vars) => executeMutation(mutationRef(getDC(), 'CancelAppointment', vars));
export const completeAppointment = (vars) => executeMutation(mutationRef(getDC(), 'CompleteAppointment', vars));
export const acceptAppointment = (vars) => executeMutation(mutationRef(getDC(), 'AcceptAppointment', vars));
export const rejectAppointment = (vars) => executeMutation(mutationRef(getDC(), 'RejectAppointment', vars));
export const updateAppointmentStatus = (vars) => executeMutation(mutationRef(getDC(), 'UpdateAppointmentStatus', vars));
export const markAppointmentReviewed = (vars) => executeMutation(mutationRef(getDC(), 'MarkAppointmentReviewed', vars));
export const submitReview = (vars) => executeMutation(mutationRef(getDC(), 'SubmitReview', vars));
export const createNotification = (vars) => executeMutation(mutationRef(getDC(), 'CreateNotification', vars));
export const markNotificationRead = (vars) => executeMutation(mutationRef(getDC(), 'MarkNotificationRead', vars));
export const markAllNotificationsRead = (vars) => executeMutation(mutationRef(getDC(), 'MarkAllNotificationsRead', vars));
export const addMedicalReport = (vars) => executeMutation(mutationRef(getDC(), 'AddMedicalReport', vars));
export const deleteMedicalReport = (vars) => executeMutation(mutationRef(getDC(), 'DeleteMedicalReport', vars));
