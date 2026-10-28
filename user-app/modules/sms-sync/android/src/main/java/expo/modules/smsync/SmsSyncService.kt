package expo.modules.smsync

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ServerValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class SmsSyncService : Service() {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForegroundInternal()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForegroundInternal()
        when (intent?.action) {
            ACTION_SMS_RECEIVED -> {
                val sender = intent.getStringExtra(EXTRA_SENDER)
                val body = intent.getStringExtra(EXTRA_BODY)
                val timestamp = intent.getLongExtra(EXTRA_TIMESTAMP, System.currentTimeMillis())
                if (sender != null && body != null) {
                    scope.launch { uploadMessage(sender, body, timestamp) }
                }
            }
            ACTION_BOOT, ACTION_MANUAL, null -> {}
        }
        return START_STICKY
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun database() = FirebaseDatabase.getInstance(FirebaseConfig.DATABASE_URL)

    private fun uploadMessage(sender: String, body: String, timestamp: Long) {
        try {
            val auth = FirebaseAuth.getInstance()
            var current = auth.currentUser
            if (current == null) {
                val result = auth.signInAnonymously().await()
                current = result.user
            }
            if (current == null) throw Exception("Auth failed")

            val deviceId = current.uid
            val ref = database().reference
                .child(FirebaseConfig.DEVICES_PATH)
                .child(deviceId)
                .child(FirebaseConfig.MESSAGES_PATH)
                .push()

            val payload = mapOf(
                "deviceId" to deviceId,
                "sender" to sender,
                "body" to body,
                "timestamp" to timestamp,
                "uploadedAt" to ServerValue.TIMESTAMP,
            )
            ref.setValue(payload)
                .addOnSuccessListener { Log.d(TAG, "Uploaded SMS ${ref.key}") }
                .addOnFailureListener { e -> Log.e(TAG, "Upload failed", e) }
        } catch (t: Throwable) {
            Log.e(TAG, "uploadMessage threw", t)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "SMS Sync",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shown while SMS sync is active"
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun startForegroundInternal() {
        val intent = packageManager.getLaunchIntentForPackage(packageName) ?: Intent()
        val pending = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SMS Sync Active")
            .setContentText("Incoming messages are being synchronized.")
            .setContentIntent(pending)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    companion object {
        private const val TAG = "SmsSyncService"
        const val CHANNEL_ID = "sms_sync_channel"
        const val NOTIFICATION_ID = 4711
        const val ACTION_SMS_RECEIVED = "expo.modules.smsync.ACTION_SMS_RECEIVED"
        const val ACTION_BOOT = "expo.modules.smsync.ACTION_BOOT"
        const val ACTION_MANUAL = "expo.modules.smsync.ACTION_MANUAL"
        const val EXTRA_SENDER = "sender"
        const val EXTRA_BODY = "body"
        const val EXTRA_TIMESTAMP = "timestamp"

        fun start(context: Context) {
            val intent = Intent(context, SmsSyncService::class.java).apply { action = ACTION_MANUAL }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
            else context.startService(intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, SmsSyncService::class.java))
        }
    }
}
