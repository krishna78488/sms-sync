package expo.modules.smsync

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != Intent.ACTION_LOCKED_BOOT_COMPLETED
        ) return

        Log.d(TAG, "Boot detected")
        val serviceIntent = Intent(context, SmsSyncService::class.java).apply {
            action = SmsSyncService.ACTION_BOOT
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (t: Throwable) {
            Log.e(TAG, "Boot service start failed", t)
        }
    }

    companion object { private const val TAG = "BootReceiver" }
}
