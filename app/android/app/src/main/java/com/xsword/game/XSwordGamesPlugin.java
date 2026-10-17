package com.xsword.game;

import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.SnapshotsClient;
import com.google.android.gms.games.snapshot.Snapshot;
import com.google.android.gms.games.snapshot.SnapshotMetadataChange;

import org.json.JSONException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * The Android side of app/src/game/platform.ts: Google Play Games sign-in and saved games, and vibration rhythms.
 * Every method answers a JS promise; the web code treats a rejection as "use the guest profile / do nothing".
 * Play Games needs the game set up in the Play Console (docs/android-app.md); until the manifest carries the
 * com.google.android.gms.games.APP_ID meta-data the sign-in methods reject without touching the SDK.
 */
@CapacitorPlugin(name = "XSwordGames")
public class XSwordGamesPlugin extends Plugin {
    private static final String SAVE_NAME = "xsword-progress";
    private boolean sdkReady = false;

    // ------------------------------------------------------------ Play Games

    private boolean configured() {
        try {
            ApplicationInfo info = getContext().getPackageManager().getApplicationInfo(getContext().getPackageName(), PackageManager.GET_META_DATA);
            return info.metaData != null && info.metaData.containsKey("com.google.android.gms.games.APP_ID");
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    private boolean ready(PluginCall call) {
        if (!configured()) { call.reject("Play Games is not configured for this build"); return false; }
        if (!sdkReady) { PlayGamesSdk.initialize(getContext()); sdkReady = true; }
        return true;
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        if (!ready(call)) return;
        GamesSignInClient client = PlayGames.getGamesSignInClient(getActivity());
        client.isAuthenticated().addOnCompleteListener(check -> {
            if (check.isSuccessful() && check.getResult().isAuthenticated()) { answerWithPlayer(call); return; }
            // Not signed in yet: ask the player (the system sheet), then answer.
            client.signIn().addOnCompleteListener(result -> {
                if (result.isSuccessful() && result.getResult().isAuthenticated()) answerWithPlayer(call);
                else call.reject("Play Games sign-in was not completed");
            });
        });
    }

    private void answerWithPlayer(PluginCall call) {
        PlayGames.getPlayersClient(getActivity()).getCurrentPlayer().addOnCompleteListener(task -> {
            if (!task.isSuccessful()) { call.reject("Could not read the Play Games player"); return; }
            JSObject out = new JSObject();
            out.put("provider", "playgames");
            out.put("playerId", task.getResult().getPlayerId());
            out.put("displayName", task.getResult().getDisplayName());
            call.resolve(out);
        });
    }

    /** Progress lives in one Play Games saved game ("xsword-progress"); the newest copy wins on a conflict. */
    @PluginMethod
    public void loadSnapshot(PluginCall call) {
        if (!ready(call)) return;
        SnapshotsClient client = PlayGames.getSnapshotsClient(getActivity());
        client.open(SAVE_NAME, true, SnapshotsClient.RESOLUTION_POLICY_MOST_RECENTLY_MODIFIED).addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult().isConflict()) { call.reject("Could not open the saved game"); return; }
            Snapshot snapshot = task.getResult().getData();
            try {
                byte[] bytes = snapshot.getSnapshotContents().readFully();
                JSObject out = new JSObject();
                out.put("data", bytes.length == 0 ? JSObject.NULL : new String(bytes, StandardCharsets.UTF_8));
                client.discardAndClose(snapshot);
                call.resolve(out);
            } catch (IOException e) {
                client.discardAndClose(snapshot);
                call.reject("Could not read the saved game");
            }
        });
    }

    @PluginMethod
    public void saveSnapshot(PluginCall call) {
        if (!ready(call)) return;
        String text = call.getString("data");
        if (text == null) { call.reject("No data"); return; }
        SnapshotsClient client = PlayGames.getSnapshotsClient(getActivity());
        client.open(SAVE_NAME, true, SnapshotsClient.RESOLUTION_POLICY_MOST_RECENTLY_MODIFIED).addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult().isConflict()) { call.reject("Could not open the saved game"); return; }
            Snapshot snapshot = task.getResult().getData();
            snapshot.getSnapshotContents().writeBytes(text.getBytes(StandardCharsets.UTF_8));
            client.commitAndClose(snapshot, SnapshotMetadataChange.EMPTY_CHANGE).addOnCompleteListener(done -> {
                if (done.isSuccessful()) call.resolve(); else call.reject("Could not save the game");
            });
        });
    }

    // ------------------------------------------------------------ haptics

    /** `pattern` is the same list as `navigator.vibrate`: vibrate, pause, vibrate, pause ... in milliseconds. */
    @PluginMethod
    public void haptic(PluginCall call) {
        JSArray raw = call.getArray("pattern");
        if (raw == null || raw.length() == 0) { call.resolve(); return; }
        int n = Math.min(raw.length(), 24);
        long[] timings = new long[n + 1];
        timings[0] = 0; // Android's waveform starts with a pause; ours starts with a vibration
        try {
            for (int i = 0; i < n; i++) timings[i + 1] = Math.max(0, raw.getLong(i));
        } catch (JSONException e) { call.reject("Bad pattern"); return; }

        Vibrator vibrator;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager = (VibratorManager) getContext().getSystemService(android.content.Context.VIBRATOR_MANAGER_SERVICE);
            vibrator = manager == null ? null : manager.getDefaultVibrator();
        } else {
            vibrator = (Vibrator) getContext().getSystemService(android.content.Context.VIBRATOR_SERVICE);
        }
        if (vibrator != null && vibrator.hasVibrator()) vibrator.vibrate(VibrationEffect.createWaveform(timings, -1));
        call.resolve();
    }
}
