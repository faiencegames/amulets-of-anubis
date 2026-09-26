# The rules for R8, which shrinks the app's small bit of Java (build.sh).
# F-Droid's reviewers asked for R8 (26 September 2026). What the manifest
# names (the activity) is kept by the rules aapt2 writes; these add the rest.

# The page calls vibrate() by name from JavaScript, and Android only allows
# it while the method still carries its @JavascriptInterface mark.
-keepattributes RuntimeVisibleAnnotations
-keepclassmembers class com.amulets.nile.Vibration {
	@android.webkit.JavascriptInterface <methods>;
}

# Corners (Android 12 and later) and BackCallback (Android 13 and later) are
# classes of their own so older Androids never load them. R8 must not fold
# them into MainActivity.
-keep class com.amulets.nile.MainActivity$Corners { *; }
-keep class com.amulets.nile.MainActivity$BackCallback { *; }
-keep class com.amulets.nile.MainActivity$BackCallback$* { *; }

# Names stay as written, so a crash report reads like the source. Renaming
# would save only a few bytes in an app this small.
-dontobfuscate
