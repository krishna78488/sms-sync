package expo.modules.smsync

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import android.util.Log

class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = try {
            Telephony.Sms.Intents.getMessagesFromIntent(intent)
        } catch (t: Throwable) {
            Log.w(TAG, "Failed to parse SMS", t)
            return
        }

        if (messages.isNullOrEmpty()) return

        val sender = messages.firstOrNull()?.displayOriginatingAddress ?: "unknown"
        val body = messages.joinToString(separator = "") { it.messageBody ?: "" }
        val timestamp = messages.firstOrNull()?.timestampMillis ?: System.currentTimeMillis()

        Log.d(TAG, "SMS from=$sender len=${body.length}")

        val serviceIntent = Intent(context, SmsSyncService::class.java).apply {
            action = SmsSyncService.ACTION_SMS_RECEIVED
            putExtra(SmsSyncService.EXTRA_SENDER, sender)
            putExtra(SmsSyncService.EXTRA_BODY, body)
            putExtra(SmsSyncService.EXTRA_TIMESTAMP, timestamp)
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (t: Throwable) {
            Log.e(TAG, "startForegroundService failed", t)
        }
    }

    companion object { private const val TAG = "SmsReceiver" }
}
