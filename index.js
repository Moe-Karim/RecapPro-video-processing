import express from "express";
import { exec } from "child_process";
import util from "util";
import fs from "fs";
const app = express();
const PORT = 4000;
const execPromise = util.promisify(exec);
app.use(express.json());

async function extractAudio(videoPath, outputDir) {
    const audioPath = `${outputDir}/audio.mp3`;
    const command = `ffmpeg -i ${videoPath} -map a -c:a libmp3lame -b:a 192k ${audioPath}`;
    await execPromise(command);
    if (!fs.existsSync(audioPath)) throw new Error("Audio extraction failed");

    return audioPath;

}
app.post("/extract-audio", async (req, res) => {
    const { videoPath, outputDir } = req.body;

  try {
    const audioPath = await extractAudio(videoPath, outputDir);
    res.json({ audioPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.listen(PORT, () => console.log(`Video processing server running on port ${PORT}`));
