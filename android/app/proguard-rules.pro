# ProGuard rules for DDT Android App
# Preserve MainActivity class and entry points from obfuscation and shrinking

-keep class com.ddt.app.MainActivity { *; }
-keep class com.ddt.app.** { *; }
