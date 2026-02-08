import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';

interface Task {
    id: string;
    name: string;
    status: string;
    riskFlag?: 'RED' | 'YELLOW' | 'GREEN';
    projectId: string;
}

interface WhatsAppAlertProps {
    tasks: Task[];
}

const WHATSAPP_API_URL = `https://graph.facebook.com/v17.0/${import.meta.env.VITE_WHATSAPP_PHONE_ID}/messages`;
const WHATSAPP_TOKEN = import.meta.env.VITE_WHATSAPP_TOKEN;

const WhatsAppAlert = ({ tasks }: WhatsAppAlertProps) => {
    const [alertsSent, setAlertsSent] = useState<Set<string>>(new Set());
    const [lastAlertTime, setLastAlertTime] = useState<number>(0);

    useEffect(() => {
        const checkRisks = async () => {
            // Find risky tasks
            const riskyTasks = tasks.filter(t => t.riskFlag === 'RED' || t.riskFlag === 'YELLOW');

            for (const task of riskyTasks) {
                const alertKey = `${task.id}-${task.riskFlag}`;

                // Prevent duplicate alerts for same state
                if (alertsSent.has(alertKey)) continue;

                // Rate limit: 1 message per 10 seconds to avoid spam during demos
                if (Date.now() - lastAlertTime < 10000) continue;

                await sendWhatsAppMessage(task);

                // Update state
                setAlertsSent(prev => new Set(prev).add(alertKey));
                setLastAlertTime(Date.now());
            }
        };

        if (tasks.length > 0) {
            checkRisks();
        }
    }, [tasks, alertsSent, lastAlertTime]);

    const sendWhatsAppMessage = async (task: Task) => {
        if (!WHATSAPP_TOKEN) {
            console.warn('WhatsApp Token missing, skipping alert for:', task.name);
            return;
        }

        try {
            // Fallback to simple text if separate template not set up
            const simpleMessage = {
                messaging_product: "whatsapp",
                to: "15550253457",
                type: "text",
                text: { body: `⚠️ ${task.riskFlag} Alert: Delay detected in ${task.name} at Site A.` }
            };

            const response = await fetch(WHATSAPP_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(simpleMessage)
            });

            if (!response.ok) throw new Error('WhatsApp API Failed');
            console.log('WhatsApp Alert Sent for:', task.name);

        } catch (error) {
            console.error('Failed to send WhatsApp alert:', error);
        }
    };

    const handleManualTrigger = () => {
        const riskyTask = tasks.find(t => t.riskFlag === 'RED' || t.riskFlag === 'YELLOW') || tasks[0];
        if (riskyTask) {
            if (confirm(`Send WhatsApp alert for ${riskyTask.name}?`)) {
                sendWhatsAppMessage(riskyTask);
                alert('Alert sent! (Check console for details if no token set)');
            }
        } else {
            alert('No tasks available to alert.');
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <button
                onClick={handleManualTrigger}
                className="bg-white p-4 rounded-full shadow-xl border border-gray-100 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-all active:scale-95 group"
                title="Send WhatsApp Alert"
            >
                <div className="relative">
                    <MessageSquare className="w-8 h-8 text-green-600 group-hover:text-green-700 transition-colors" />
                    {tasks.some(t => t.riskFlag === 'RED' || t.riskFlag === 'YELLOW') && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    )}
                </div>
            </button>
        </div>
    );
};

export default WhatsAppAlert;
