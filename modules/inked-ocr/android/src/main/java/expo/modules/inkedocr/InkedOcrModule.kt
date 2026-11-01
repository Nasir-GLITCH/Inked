package expo.modules.inkedocr

import android.graphics.Rect
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File

// Result types returned to JavaScript. Field names are part of the JS contract and are
// validated on the JS side (src/features/ocr/recognitionSchema.ts), so keep them in sync.

class FrameRecord(
  @Field val left: Int = 0,
  @Field val top: Int = 0,
  @Field val right: Int = 0,
  @Field val bottom: Int = 0
) : Record

class ElementRecord(
  @Field val text: String = "",
  @Field val confidence: Float = 0f,
  @Field val frame: FrameRecord = FrameRecord()
) : Record

class LineRecord(
  @Field val text: String = "",
  @Field val confidence: Float = 0f,
  @Field val angle: Float = 0f,
  @Field val frame: FrameRecord = FrameRecord(),
  @Field val elements: List<ElementRecord> = emptyList()
) : Record

class BlockRecord(
  @Field val text: String = "",
  @Field val frame: FrameRecord = FrameRecord(),
  @Field val lines: List<LineRecord> = emptyList()
) : Record

class RecognitionRecord(
  @Field val text: String = "",
  @Field val imageWidth: Int = 0,
  @Field val imageHeight: Int = 0,
  @Field val durationMs: Int = 0,
  @Field val blocks: List<BlockRecord> = emptyList()
) : Record

/**
 * On-device text recognition with Google ML Kit (Latin script, model bundled in the app,
 * so it works offline). Unlike off-the-shelf wrappers it also returns ML Kit's confidence
 * score for every line and word.
 */
class InkedOcrModule : Module() {
  // Creating a recognizer is expensive, so one is created on first use and reused.
  private val recognizer by lazy {
    TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
  }

  override fun definition() = ModuleDefinition {
    Name("InkedOcr")

    AsyncFunction("recognizeText") { imageUri: String, promise: Promise ->
      recognize(imageUri, promise)
    }
  }

  private fun recognize(imageUri: String, promise: Promise) {
    val context = appContext.reactContext
    if (context == null) {
      promise.reject("E_NO_CONTEXT", "The app is not ready to read images yet.", null)
      return
    }

    val uri = try {
      toSupportedUri(imageUri)
    } catch (error: IllegalArgumentException) {
      promise.reject("E_INVALID_URI", error.message, error)
      return
    }

    val image = try {
      // Applies the photo's EXIF rotation, so upright text is read upright.
      InputImage.fromFilePath(context, uri)
    } catch (error: Exception) {
      promise.reject("E_IMAGE_UNREADABLE", "The image could not be opened.", error)
      return
    }

    val startedAtNanos = System.nanoTime()
    recognizer.process(image)
      .addOnSuccessListener { result ->
        val durationMs = ((System.nanoTime() - startedAtNanos) / 1_000_000).toInt()
        promise.resolve(toRecord(result, image.width, image.height, durationMs))
      }
      .addOnFailureListener { error ->
        promise.reject("E_RECOGNITION_FAILED", "Text recognition failed.", error)
      }
  }

  /** Accepts file:// and content:// URIs and plain absolute paths. Refuses anything else (for example http). */
  private fun toSupportedUri(raw: String): Uri {
    val parsed = Uri.parse(raw)
    return when (parsed.scheme) {
      "file", "content" -> parsed
      null -> Uri.fromFile(File(raw))
      else -> throw IllegalArgumentException("Only local images can be read.")
    }
  }

  private fun toRecord(result: Text, width: Int, height: Int, durationMs: Int) = RecognitionRecord(
    text = result.text,
    imageWidth = width,
    imageHeight = height,
    durationMs = durationMs,
    blocks = result.textBlocks.map { block ->
      BlockRecord(
        text = block.text,
        frame = toFrame(block.boundingBox),
        lines = block.lines.map { line ->
          LineRecord(
            text = line.text,
            confidence = line.confidence,
            angle = line.angle,
            frame = toFrame(line.boundingBox),
            elements = line.elements.map { element ->
              ElementRecord(
                text = element.text,
                confidence = element.confidence,
                frame = toFrame(element.boundingBox)
              )
            }
          )
        }
      )
    }
  )

  private fun toFrame(rect: Rect?) = FrameRecord(
    left = rect?.left ?: 0,
    top = rect?.top ?: 0,
    right = rect?.right ?: 0,
    bottom = rect?.bottom ?: 0
  )
}
