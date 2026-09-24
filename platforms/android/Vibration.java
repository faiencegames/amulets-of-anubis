package com.amulets.nile;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;

public class Vibration {
	private final Context ctx;

	public Vibration(Context ctx) { this.ctx = ctx; }

	@android.webkit.JavascriptInterface
	public void vibrate(String json) {
		try {
			Vibrator vib = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
			if (vib == null || !vib.hasVibrator()) return;
			long[] pattern = parse(json);
			if (pattern == null) return;
			if (Build.VERSION.SDK_INT >= 26) {
				vib.vibrate(VibrationEffect.createWaveform(pattern, -1));
			} else {
				vib.vibrate(pattern, -1);
			}
		} catch (Exception e) {}
	}

	private long[] parse(String json) {
		String s = json.trim();
		if (s.startsWith("[")) {
			s = s.substring(1, s.length() - 1).trim();
			if (s.isEmpty()) return new long[]{0};
			String[] parts = s.split(",");
			long[] out = new long[parts.length];
			for (int i = 0; i < parts.length; i++) out[i] = Long.parseLong(parts[i].trim());
			return out;
		}
		return new long[]{0, Long.parseLong(s)};
	}
}
