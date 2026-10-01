import { JobKind, JobStatus } from "../libs/enums/job.enum";
import AppError, { ErrorCode, Message } from "../libs/Errors";
import type { JobResult } from "../libs/types/audioStudio";
import { secondsToSrtTimestamp } from "../libs/utils/srt";
import { jobRepository } from "../repositories/job.repository";

export type TranscriptFormat = "txt" | "srt" | "json";

export interface TranscriptExport {
  content: string;
  contentType: string;
  filename: string;
}

type TranscriptionResult = Extract<JobResult, { kind: "transcription" }>;

export const transcriptService = {
  async exportTranscript(jobId: string, format: TranscriptFormat): Promise<TranscriptExport> {
    const job = await jobRepository.findById(jobId);
    if (!job) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (job.kind !== JobKind.TRANSCRIPTION || job.status !== JobStatus.SUCCEEDED || !job.result) {
      throw new AppError(ErrorCode.CONFLICT, "Transcript is only available for a succeeded transcription job");
    }

    const result = job.result as TranscriptionResult;

    if (format === "json") {
      return { content: JSON.stringify(result, null, 2), contentType: "application/json", filename: `transcript-${jobId}.json` };
    }

    if (format === "srt") {
      const body = result.segments
        .map((segment, index) => `${index + 1}\n${secondsToSrtTimestamp(segment.start)} --> ${secondsToSrtTimestamp(segment.end)}\n${segment.text}\n`)
        .join("\n");
      return { content: body, contentType: "application/x-subrip", filename: `transcript-${jobId}.srt` };
    }

    return { content: result.transcript, contentType: "text/plain", filename: `transcript-${jobId}.txt` };
  },
};
