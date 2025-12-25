package com.workops.app;

import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

@CapacitorPlugin(name = "FileViewer")
public class FileViewerPlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        String uriString = call.getString("uri");
        String mimeType = call.getString("mimeType", "application/pdf");

        if (uriString == null) {
            call.reject("uri is required");
            return;
        }

        try {
            Uri uri = Uri.parse(uriString);
            if ("file".equalsIgnoreCase(uri.getScheme())) {
                File file = new File(uri.getPath());
                uri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    file
                );
            }

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, mimeType);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(intent, "Open with");
            getActivity().startActivity(chooser);

            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to open file: " + e.getMessage());
        }
    }
}
