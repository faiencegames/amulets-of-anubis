package com.amulets.nile;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

@SuppressWarnings({"rawtypes","unchecked"})
public class MainActivity extends Activity implements ValueCallback {
	private WebView web;

	@Override protected void onCreate(Bundle state) {
		super.onCreate(state);
		getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
		web = new WebView(this);
		web.setBackgroundColor(Color.parseColor("#3a2812"));
		WebSettings s = web.getSettings();
		s.setJavaScriptEnabled(true);
		s.setDomStorageEnabled(true);
		s.setMediaPlaybackRequiresUserGesture(false);
		s.setTextZoom(100);
		web.setWebViewClient(new WebViewClient());
		web.setOverScrollMode(View.OVER_SCROLL_NEVER);
		setContentView(web);
		web.addJavascriptInterface(new Vibration(this), "AndroidVibrate");
		hideBars();
		if (state != null) web.restoreState(state); else web.loadUrl("file:///android_asset/index.html");
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

	@SuppressWarnings("deprecation")
	@Override public void onBackPressed() {
		web.evaluateJavascript(
			"(function(){var o=document.querySelector('.overlay.open'); if(!o) return 'none';"
			+ "var b=o.querySelector('#mapClose'); if(b){b.click(); return 'closed';}"
			+ "if(o.id==='ovMsg'){ var a=o.querySelector('.actions .btn'); if(a && document.getElementById('msgTitle') && document.getElementById('msgTitle').textContent==='How to play'){a.click(); return 'closed';} }"
			+ "return 'none';})()",
			this);
	}

	@Override public void onReceiveValue(Object v) { if (!"\"closed\"".equals(v)) finish(); }
}
