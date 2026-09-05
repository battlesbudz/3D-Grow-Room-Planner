package com.battlesbudz.growroomplanner

import android.content.Context
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import androidx.compose.ui.platform.LocalContext
import com.google.ar.core.Config
import com.google.ar.core.Frame
import com.google.ar.core.Plane
import com.google.ar.core.Session
import io.github.sceneview.ar.ARSceneView
import io.github.sceneview.ar.node.AnchorNode
import io.github.sceneview.node.ModelNode
import io.github.sceneview.rememberEngine
import io.github.sceneview.rememberModelLoader
import io.github.sceneview.rememberModelInstance
import java.io.File

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); setContent { GrowRoomPlannerApp() } }
}

@Composable
private fun GrowRoomPlannerApp() {
    val context = LocalContext.current
    val engine = rememberEngine()
    val modelLoader = rememberModelLoader(engine)
    var modelLocation by remember { mutableStateOf<String?>(null) }
    var anchor by remember { mutableStateOf<com.google.ar.core.Anchor?>(null) }
    var planeCount by remember { mutableStateOf(0) }
    var frameCount by remember { mutableStateOf(0) }
    var depthAvailable by remember { mutableStateOf(false) }
    var trackingText by remember { mutableStateOf("Move slowly to find the floor and walls") }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (uri != null) modelLocation = copyModelToCache(context, uri)
    }

    MaterialTheme {
        Surface(Modifier.fillMaxSize(), color = Color.Black) {
            Box(Modifier.fillMaxSize()) {
                ARSceneView(
                    modifier = Modifier.fillMaxSize(),
                    engine = engine,
                    modelLoader = modelLoader,
                    planeRenderer = true,
                    depthMode = Config.DepthMode.AUTOMATIC,
                    onSessionCreated = { session -> depthAvailable = session.isDepthModeSupported(Config.DepthMode.AUTOMATIC) },
                    onTrackingFailureChanged = { reason -> trackingText = reason?.name ?: "Tracking room" },
                    onSessionUpdated = { session, frame ->
                        frameCount += 1
                        planeCount = session.getAllTrackables(Plane::class.java).count { it.trackingState == com.google.ar.core.TrackingState.TRACKING }
                        if (anchor == null) anchor = findFloorAnchor(frame)
                    }
                ) {
                    val model = modelLocation?.let { rememberModelInstance(modelLoader, fileLocation = it) }
                    if (anchor != null && model != null) AnchorNode(anchor = anchor!!) { ModelNode(modelInstance = model, scaleToUnits = 1.0f) }
                }
                Column(Modifier.fillMaxWidth().align(Alignment.TopCenter).padding(16.dp).zIndex(2f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Card { Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("3D Grow Room Planner", style = MaterialTheme.typography.titleLarge)
                        Text("Scanner-first test build", style = MaterialTheme.typography.labelMedium)
                        Text(trackingText, style = MaterialTheme.typography.bodySmall)
                        Text("Planes: $planeCount  •  Frames: $frameCount  •  Depth: ${if (depthAvailable) "available" else "checking"}", style = MaterialTheme.typography.bodySmall)
                    } }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { picker.launch(arrayOf("model/gltf-binary", "model/gltf+json", "application/octet-stream")) }) { Text("Import GLB") }
                        Button(onClick = { anchor = null; modelLocation = null }) { Text("Reset") }
                    }
                }
                if (modelLocation == null) Text("Import a GLB, then slowly scan the floor", Modifier.align(Alignment.BottomCenter).padding(28.dp), color = Color.White)
            }
        }
    }
}

private fun findFloorAnchor(frame: Frame): com.google.ar.core.Anchor? = frame.getUpdatedTrackables(Plane::class.java).firstOrNull { it.trackingState == com.google.ar.core.TrackingState.TRACKING && it.type == Plane.Type.HORIZONTAL_UPWARD_FACING }?.let { it.createAnchor(it.centerPose) }

private fun copyModelToCache(context: Context, uri: Uri): String? = runCatching {
    val target = File(context.cacheDir, "imported-room-model.glb")
    context.contentResolver.openInputStream(uri)!!.use { input -> target.outputStream().use { output -> input.copyTo(output) } }
    "file://${target.absolutePath}"
}.getOrNull()
