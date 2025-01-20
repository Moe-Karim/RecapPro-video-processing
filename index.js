import { exec } from "child_process";
import util from "util";
import fs from "fs";

const execPromise = util.promisify(exec);

export async function extractAudio(videoPath, outputDir) {
  const copiedVideoPath = `${outputDir}copied_video.mp4`;
  const audioPath = `${outputDir}audio`;

  const copyVideoCmd = `ffmpeg -i ${videoPath} -c copy ${copiedVideoPath}`;

  console.log("Running ffmpeg command to copy video:", copyVideoCmd);
  try {
    await execPromise(copyVideoCmd);
    console.log("Video copied successfully:", copiedVideoPath);

    const extractAudioCmd = `ffmpeg -i ${copiedVideoPath} -map a -c:a libmp3lame -b:a 192k ${audioPath}.mp3`;

    console.log("🎬 Extracting audio from:", videoPath);
    await execPromise(extractAudioCmd);

    if (!fs.existsSync(`${audioPath}.mp3`)) {
      throw new Error("❌ Audio extraction failed! File does not exist.");
    }
    console.log("Audio extraction complete:", `${audioPath}.mp3`);

    return `${audioPath}`;
  } catch (error) {
    console.error("Error during video copy or audio extraction:", error);
    throw error;
  }
}

export async function detectSilence(audioPath) {
  const cmd = `ffmpeg -i ${audioPath}.mp3 -af silencedetect=n=-20dB:d=5 -f null -`;
  try {
    const { stderr } = await execPromise(cmd);
    return parseSilenceOutput(stderr);
  } catch (error) {
    if (error.stderr) {
      console.error("🛠️ FFmpeg Error Output:\n", error.stderr);
    }
    throw error;
  }
}

function parseSilenceOutput(stderr) {
  const silenceTimes = [];
  const silenceRegex = /silence_start:\s*([\d.]+)|silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/g;

  let match;
  let currentStart = null;

  while ((match = silenceRegex.exec(stderr)) !== null) {
    if (match[1]) {

      currentStart = parseFloat(match[1]);
    } else if (match[2] && currentStart !== null) {
      const end = parseFloat(match[2]);
      const duration = parseFloat(match[3]);
      silenceTimes.push({ start: currentStart, end, duration });
      currentStart = null;
    }
  }
  const stderrLines = stderr.trim().split("\n");
  return silenceTimes;
}

function formatTime(seconds) {
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substr(11, 8);
}

export async function segmentVideoBasedOnTimestamps(
  videoPath,
  audioPath,
  topics,
  outputDir
) {
  if (!topics || topics.length === 0) {
    throw new Error("No valid topics found to segment the video.");
  }

  const segmentPromises = topics.map(async (item, index) => {
    const startTime = formatTime(item.start);
    const endTime = formatTime(item.end);
    const segmentFilename = `${outputDir}segment_${index + 1}.mp4`;

    const segmentCmd = `ffmpeg -i ${videoPath} -i ${audioPath}.mp3 -ss ${startTime} -to ${endTime} -map 0:v:0 -map 1:a:0 -c:v copy -c:a copy -y ${segmentFilename}`;

    console.log("Running ffmpeg command to segment video:", segmentCmd);

    try {
      await execPromise(segmentCmd);
      console.log(`Video segment ${index + 1} created at ${segmentFilename}`);
      return segmentFilename;
    } catch (error) {
      console.error(`Error creating video segment ${index + 1}:`, error);
      throw error;
    }
  });

  return await Promise.all(segmentPromises);
}

export async function burnSubtitles(videoPath, srtPath, audioPath, outputPath) {
  const burnSubtitlesCmd = `ffmpeg -i ${videoPath} -i ${audioPath} -vf "subtitles=${srtPath}" -c:v libx264 -c:a aac -b:a 192k -shortest -y ${outputPath}`;
  try {
    await execPromise(burnSubtitlesCmd);
    console.log("Subtitles burned successfully:", outputPath);
  } catch (error) {
    console.error("Error burning subtitles:", error);
    throw new Error("Subtitle burning failed");
  }
}
