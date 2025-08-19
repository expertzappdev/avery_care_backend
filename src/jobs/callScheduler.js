import cron from 'node-cron';
import ScheduledCall from '../models/scheduledCallSummary.js';
import { triggerCall } from '../controllers/callController.js';
// Import the new WhatsApp service
import { sendWhatsAppReminder } from '../services/whatsappService.js';

// This map will now store both call and reminder jobs
const scheduledJobs = new Map();

/**
 * Schedules a new call and its associated WhatsApp reminder.
 * @param {object} call - The ScheduledCall model document.
 */
export const scheduleNewCall = (call) => {
    // Cancel any existing jobs if this call is being rescheduled
    cancelScheduledCall(call._id.toString());

    if (call.triesLeft <= 0) {
        console.log(`Scheduler: Call ID ${call._id} ke liye koi tries bache nahi hain. Isse schedule nahi kiya jaayega.`);
        return;
    }

    const callTime = new Date(call.scheduledAt);
    const now = new Date();
    const timezone = 'Asia/Kolkata';

    // Immediate Call Logic (If the call time has already passed)
    if (callTime <= now) {
        console.log(`Scheduler: New call ID ${call._id} ka time beet gaya hai. Turant call trigger kar rahe hain.`);
        triggerCall(call.recipientNumber, call._id)
            .catch(err => console.error(`Scheduler: New call ID ${call._id} immediately trigger karne mein fail hua:`, err));
        return;
    }

    // --- NEW: WhatsApp Reminder Scheduling ---
    // Schedule reminder 10 minutes before the call
    const reminderTime = new Date(callTime.getTime() - 10 * 60 * 1000);
    let reminderJob = null;

    // Only schedule reminder if it's in the future
    if (reminderTime > now) {
        const reminderCronString = `${reminderTime.getMinutes()} ${reminderTime.getHours()} ${reminderTime.getDate()} ${reminderTime.getMonth() + 1} *`;

        if (cron.validate(reminderCronString)) {
            console.log(`Scheduler: WhatsApp reminder for Call ID ${call._id} set hai. Cron: "${reminderCronString}"`);
            reminderJob = cron.schedule(reminderCronString, () => {
                console.log(`Scheduler: WhatsApp reminder cron job chal raha hai. Call ID: ${call._id}`);
                sendWhatsAppReminder(call.recipientNumber, call.recipientName, callTime)
                    .then(() => {
                        console.log(`Scheduler: WhatsApp reminder for Call ID ${call._id} successful.`);
                        // Stop the reminder job once it has run
                        const jobs = scheduledJobs.get(call._id.toString());
                        if (jobs && jobs.reminderJob) {
                            jobs.reminderJob.stop();
                            jobs.reminderJob = null; // Remove reference
                        }
                    })
                    .catch(err => {
                        console.error(`Scheduler: WhatsApp reminder for Call ID ${call._id} fail ho gaya:`, err);
                    });
            }, { scheduled: true, timezone });
        } else {
            console.error(`Scheduler: INVALID CRON STRING for WhatsApp reminder for Call ID ${call._id}: "${reminderCronString}".`);
        }
    } else {
        console.log(`Scheduler: Reminder time for Call ID ${call._id} beet gaya hai. Reminder nahi bhej rahe.`);
    }

    // --- Existing Call Scheduling Logic ---
    const callCronString = `${callTime.getMinutes()} ${callTime.getHours()} ${callTime.getDate()} ${callTime.getMonth() + 1} *`;
    let callJob = null;

    if (cron.validate(callCronString)) {
        console.log(`Scheduler: Call ID ${call._id} ke liye cron job set hai. Cron: "${callCronString}"`);
        callJob = cron.schedule(callCronString, () => {
            console.log(`Scheduler: Scheduled call ka cron job chal raha hai. Call ID: ${call._id}`);
            triggerCall(call.recipientNumber, call._id)
                .catch(err => {
                    console.error(`Scheduler: Call ID ${call._id} fail ho gaya:`, err);
                });
        }, { scheduled: true, timezone });
    } else {
        console.error(`Scheduler: INVALID CRON STRING for Call ID ${call._id}: "${callCronString}".`);
    }

    // Store both jobs in the map
    if (callJob || reminderJob) {
        scheduledJobs.set(call._id.toString(), { callJob, reminderJob });
    }
};

/**
 * Schedules all pending calls when the application starts.
 */
export const startScheduler = async () => {
    console.log("Scheduler start ho raha hai...");
    try {
        const pendingCalls = await ScheduledCall.find({ status: 'pending', triesLeft: { $gt: 0 } });
        console.log(`Scheduler: ${pendingCalls.length} pending calls mile jinke tries bache hain.`);
        if (pendingCalls.length === 0) {
            console.log("Scheduler: Koi pending call nahi hai.");
            return;
        }
        pendingCalls.forEach(call => {
            scheduleNewCall(call);
        });
    } catch (err) {
        console.error("Scheduler: startScheduler mein ERROR:", err);
    }
};

/**
 * Cancels both call and reminder jobs for a specific call ID.
 * @param {string} callId - The ID of the call to be cancelled.
 * @returns {boolean} - True if jobs were found and cancelled, false otherwise.
 */
export const cancelScheduledCall = (callId) => {
    const callIdStr = callId.toString();
    const jobs = scheduledJobs.get(callIdStr);

    if (jobs) {
        // Stop call job if it exists
        jobs.callJob?.stop();
        // Stop reminder job if it exists
        jobs.reminderJob?.stop();

        scheduledJobs.delete(callIdStr);
        console.log(`Scheduler: All scheduled jobs for Call ID ${callId} cancelled.`);
        return true;
    }

    // console.log(`Scheduler: No active jobs found for Call ID ${callId} to cancel.`);
    return false;
};