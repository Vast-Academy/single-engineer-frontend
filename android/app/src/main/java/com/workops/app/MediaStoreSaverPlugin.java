package com.workops.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.media.MediaScannerConnection;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "MediaStoreSaver")
public class MediaStoreSaverPlugin extends Plugin {

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        String fileName = call.getString("fileName");
        String base64 = call.getString("base64");
        String mimeType = call.getString("mimeType", "application/pdf");

        if (fileName == null || base64 == null) {
            call.reject("fileName and base64 are required");
            return;
        }

        byte[] data;
        try {
            data = Base64.decode(base64, Base64.DEFAULT);
        } catch (Exception e) {
            call.reject("Invalid base64 data");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            saveWithMediaStore(call, fileName, data, mimeType);
            return;
        }

        saveLegacy(call, fileName, data, mimeType);
    }

    private void saveWithMediaStore(PluginCall call, String fileName, byte[] data, String mimeType) {
        try {
            ContentResolver resolver = getContext().getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            values.put(MediaStore.Downloads.IS_PENDING, 1);

            Uri collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
            Uri itemUri = resolver.insert(collection, values);

            if (itemUri == null) {
                call.reject("Failed to create MediaStore entry");
                return;
            }

            try (OutputStream out = resolver.openOutputStream(itemUri)) {
                if (out == null) {
                    call.reject("Failed to open output stream");
                    return;
                }
                out.write(data);
            }

            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            resolver.update(itemUri, values, null, null);

            JSObject result = new JSObject();
            result.put("uri", itemUri.toString());
            result.put("isPublic", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("MediaStore save failed: " + e.getMessage());
        }
    }

    private void saveLegacy(PluginCall call, String fileName, byte[] data, String mimeType) {
        try {
            File downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!downloads.exists() && !downloads.mkdirs()) {
                call.reject("Failed to access Downloads directory");
                return;
            }

            File file = new File(downloads, fileName);
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(data);
            }

            MediaScannerConnection.scanFile(
                getContext(),
                new String[]{ file.getAbsolutePath() },
                new String[]{ mimeType },
                null
            );

            JSObject result = new JSObject();
            result.put("uri", Uri.fromFile(file).toString());
            result.put("isPublic", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Legacy save failed: " + e.getMessage());
        }
    }
}
