package com.xsword.game;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Our own plugin lives in the app instead of an npm package; it must be registered before the bridge starts.
        registerPlugin(XSwordGamesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
