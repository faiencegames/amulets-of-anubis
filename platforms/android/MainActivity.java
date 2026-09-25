package com.amulets.nile;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.DisplayCutout;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

@SuppressWarnings({"rawtypes","unchecked"})
public class MainActivity extends Activity implements ValueCallback {
	private WebView web;
	// the part of each edge a notch or camera hole covers, in CSS pixels
	private int cutTop, cutRight, cutBottom, cutLeft;
	// how round the screen's corners are, top and bottom, in CSS pixels
	int roundTop, roundBottom;

	@Override protected void onCreate(Bundle state) {
		super.onCreate(state);
		getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
		// Use the whole screen, the strip beside a notch too (from Android 15
		// every app does), and tell the game where the notch is (cutout()),
		// so it keeps the top bar out of its way.
		if (Build.VERSION.SDK_INT >= 28) {
			WindowManager.LayoutParams lp = getWindow().getAttributes();
			lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
			getWindow().setAttributes(lp);
		}
		// a debug build (ANDROID_DEBUG=1 ./build.sh android) lets Chrome's tools
		// on a computer look into the page over USB; a release build never does
		if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);
		web = new WebView(this);
		web.setBackgroundColor(Color.parseColor("#3a2812"));
		WebSettings s = web.getSettings();
		s.setJavaScriptEnabled(true);
		s.setDomStorageEnabled(true);
		s.setMediaPlaybackRequiresUserGesture(false);
		s.setTextZoom(100);
		web.setWebViewClient(new WebViewClient() {
			@Override public void onPageFinished(WebView v, String url) { cutout(); }
		});
		web.setOverScrollMode(View.OVER_SCROLL_NEVER);
		web.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
			@Override public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
				if (Build.VERSION.SDK_INT >= 28) {
					DisplayCutout c = insets.getDisplayCutout();
					float d = getResources().getDisplayMetrics().density;
					cutTop = c == null ? 0 : Math.round(c.getSafeInsetTop() / d);
					cutRight = c == null ? 0 : Math.round(c.getSafeInsetRight() / d);
					cutBottom = c == null ? 0 : Math.round(c.getSafeInsetBottom() / d);
					cutLeft = c == null ? 0 : Math.round(c.getSafeInsetLeft() / d);
					if (Build.VERSION.SDK_INT >= 31) Corners.read(MainActivity.this, insets, d);
					cutout();
				}
				return v.onApplyWindowInsets(insets);
			}
		});
		setContentView(web);
		web.addJavascriptInterface(new Vibration(this), "AndroidVibrate");
		hideBars();
		if (Build.VERSION.SDK_INT >= 33) BackCallback.register(this);
		if (state != null) web.restoreState(state); else web.loadUrl("file:///android_asset/index.html");
	}

	// the notch's insets and the corners' radius as CSS variables (--cut-top
	// and the rest, --round-top, --round-bottom; web/css/01-base.css); again
	// after every page load
	private void cutout() {
		web.evaluateJavascript("(function(s){s.setProperty('--cut-top','" + cutTop + "px');s.setProperty('--cut-right','"
			+ cutRight + "px');s.setProperty('--cut-bottom','" + cutBottom + "px');s.setProperty('--cut-left','"
			+ cutLeft + "px');s.setProperty('--round-top','" + roundTop + "px');s.setProperty('--round-bottom','"
			+ roundBottom + "px')})(document.documentElement.style)", null);
	}

	@SuppressWarnings("deprecation")
	private void hideBars() {
		getWindow().getDecorView().setSystemUiVisibility(
			View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
			| View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
	}

	@Override public void onWindowFocusChanged(boolean focus) { super.onWindowFocusChanged(focus); if (focus) hideBars(); }
	@Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
	@Override protected void onPause() { super.onPause(); web.onPause(); }
	@Override protected void onResume() { super.onResume(); web.onResume(); hideBars(); }

	// Back closes the scroll that is open, as Escape does (androidBack() in
	// src/game/23-scrolls.js); on the board or the title the first Back asks,
	// and a second one soon after leaves the app. Up to Android 12 Back comes
	// here; from Android 13 through BackCallback, which Android 16 requires.
	@SuppressWarnings("deprecation")
	@Override public void onBackPressed() { back(); }

	void back() { web.evaluateJavascript("window.androidBack ? androidBack() : 'none'", this); }

	@Override public void onReceiveValue(Object v) { if (!"\"closed\"".equals(v)) finish(); }

	// Android 12 and later only: the radius of the screen's rounded corners
	static class Corners {
		static void read(MainActivity a, WindowInsets insets, float d) {
			a.roundTop = Math.round(Math.max(radius(insets, android.view.RoundedCorner.POSITION_TOP_LEFT),
				radius(insets, android.view.RoundedCorner.POSITION_TOP_RIGHT)) / d);
			a.roundBottom = Math.round(Math.max(radius(insets, android.view.RoundedCorner.POSITION_BOTTOM_LEFT),
				radius(insets, android.view.RoundedCorner.POSITION_BOTTOM_RIGHT)) / d);
		}
		static int radius(WindowInsets insets, int at) {
			android.view.RoundedCorner c = insets.getRoundedCorner(at);
			return c == null ? 0 : c.getRadius();
		}
	}

	// Android 13 and later only: a class of its own, so older Androids never load it
	static class BackCallback {
		static void register(final MainActivity a) {
			a.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT,
				new OnBackInvokedCallback() {
					@Override public void onBackInvoked() { a.back(); }
				});
		}
	}
}
