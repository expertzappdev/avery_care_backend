import cron from 'node-cron';
import ScheduledCall from '../models/scheduledCallSummary.js';
import { triggerCall } from '../controllers/callController.js';

const scheduledJobs = new Map();

export const scheduleNewCall = (call) => {
    if (call.triesLeft <= 0) {
        console.log(`Scheduler: Call ID ${call._id} ke liye koi tries bache nahi hain. Isse schedule nahi kiya jaayega.`);
        return;
    }

    const callTime = new Date(call.scheduledAt);
    const now = new Date();

    if (callTime <= now) {
        console.log(`Scheduler: New call ID ${call._id} ka time beet gaya hai (${callTime.toISOString()}). Turant call trigger kar rahe hain.`);
        triggerCall(call.recipientNumber, call._id)
            .catch(err => console.error(`Scheduler: New call ID ${call._id} immediately trigger karne mein fail hua:`, err));
        return;
    }

    const cronString = `${callTime.getMinutes()} ${callTime.getHours()} ${callTime.getDate()} ${callTime.getMonth() + 1} *`;
    const timezone = 'Asia/Kolkata';

    if (cron.validate(cronString)) {
        console.log(`Scheduler: Naye call ID ${call._id} ke liye cron job set hai. Cron: "${cronString}", Timezone: "${timezone}"`);

        const job = cron.schedule(cronString, () => {
            console.log(`Scheduler: Naye scheduled call ka cron job chal raha hai. Call ID: ${call._id}`);
            triggerCall(call.recipientNumber, call._id)
                .then(() => {
                    console.log(`Scheduler: Call ID ${call._id} successful. Job stop kar rahe hain.`);
                    scheduledJobs.get(call._id)?.stop();
                    scheduledJobs.delete(call._id);
                })
                .catch(err => {
                    console.error(`Scheduler: Naya call ID ${call._id} fail ho gaya:`, err);
                });
        }, {
            scheduled: true,
            timezone: timezone
        });

        scheduledJobs.set(call._id.toString(), job);
    } else {
        console.error(`Scheduler: INVALID CRON STRING for new Call ID ${call._id}: "${cronString}". Scheduler start nahi hoga.`);
    }
};

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