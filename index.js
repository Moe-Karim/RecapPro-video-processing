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

}