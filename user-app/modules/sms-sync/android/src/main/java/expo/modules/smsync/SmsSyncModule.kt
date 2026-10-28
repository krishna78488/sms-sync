package expo.modules.smsync

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SmsSyncModule : Module() {
    private val context
        get() = appContext.reactContext ?: throw IllegalStateException("Missing context")

    override fun definition() = ModuleDefinition {
        Name("SmsSync")

        Function("start") {
            SmsSyncService.start(context)
        }

        Function("stop") {
            SmsSyncService.stop(context)
        }

        Function("isRunning") {
            true
        }

        Function("hasConsented") {
            true
        }

        Function("setConsented") {}

        Function("getDeviceLabel") {
            "${Build.MANUFACTURER} ${Build.MODEL}"
        }

        Function("getStatus") {
            "Service Active"
        }

        AsyncFunction("getDeviceId") {
            com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid
        }

        AsyncFunction("getPermissionsStatus") {
            buildMap<String, Any> {
                put("receiveSms", ContextCompat.checkSelfPermission(context, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED)
                put("readSms", ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED)
                put("readPhoneState", ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED)
            }
        }
    }
}
