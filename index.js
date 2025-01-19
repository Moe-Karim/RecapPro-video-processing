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

async function segmentVideoBasedOnTimestamps(videoPath, audioPath, topics, outputDir) {
    if (!topics || topics.length === 0) {
      throw new Error("No valid topics found to segment the video.");
    }

    const segmentPromises = topics.map(async (item, index) => {
      const startTime = formatTime(item.start);
      const endTime = formatTime(item.end);
      const segmentFilename = `${outputDir}segment_${index + 1}.mp4`;

      const segmentCmd = `ffmpeg -i ${videoPath} -i ${audioPath}.mp3 -ss ${startTime} -to ${endTime} -map 0:v:0 -map 1:a:0 -c:v copy -c:a copy -y ${segmentFilename}`;


      try {
        await execPromise(segmentCmd);
        return segmentFilename;
      } catch (error) {
        throw error;
      }
    });

    return await Promise.all(segmentPromises);
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
