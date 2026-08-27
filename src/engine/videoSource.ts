export type VideoSourceType = 'webcam' | 'file' | 'url' | 'disabled';

export interface VideoSource {
  type: VideoSourceType;
  label: string;
  stream?: MediaStream;
  url?: string;
  fileUrl?: string;
}

export class VideoSourceManager {
  private currentSource: VideoSource | null = null;
  private videoElement: HTMLVideoElement | null = null;

  public async startWebcam(video: HTMLVideoElement): Promise<VideoSource> {
    this.stop();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    this.videoElement = video;
    this.currentSource = { type: 'webcam', label: 'Device Webcam', stream };
    return this.currentSource;
  }

  public async startFile(video: HTMLVideoElement, file: File): Promise<VideoSource> {
    this.stop();
    const fileUrl = URL.createObjectURL(file);
    video.src = fileUrl;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    this.videoElement = video;
    this.currentSource = { type: 'file', label: file.name, fileUrl };
    return this.currentSource;
  }

  public async startUrl(video: HTMLVideoElement, url: string): Promise<VideoSource> {
    this.stop();
    video.src = url;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    try {
      await video.play();
      this.videoElement = video;
      this.currentSource = { type: 'url', label: url, url };
      return this.currentSource;
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  public stop() {
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement.src = '';
    }
    if (this.currentSource?.stream) {
      this.currentSource.stream.getTracks().forEach((track) => track.stop());
    }
    if (this.currentSource?.fileUrl) {
      URL.revokeObjectURL(this.currentSource.fileUrl);
    }
    this.currentSource = null;
    this.videoElement = null;
  }

  public getCurrentSource(): VideoSource | null {
    return this.currentSource;
  }
}

export const videoSourceManager = new VideoSourceManager();
