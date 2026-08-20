/** YouTube player / streaming payload types used by the extension. */

export type AdaptiveAudioTrackInfo = {
  readonly id: string;
  readonly displayName: string;
  audioIsDefault: boolean;
  readonly isAutoDubbed?: boolean;
};

export type AdaptiveFormat = {
  readonly mimeType: string;
  readonly audioTrack?: AdaptiveAudioTrackInfo;
};

export type StreamingData = {
  adaptiveFormats: AdaptiveFormat[];
};

export type VideoDetails = {
  readonly videoId: string;
  readonly title: string;
};

export type PlayerResponse = {
  readonly streamingData?: StreamingData;
  readonly videoDetails?: VideoDetails;
};

export type PlayerLanguageInfo = {
  readonly id: string;
  readonly name: string;
  readonly isDefault: boolean;
  getId(): string;
  getName(): string;
  getIsDefault(): boolean;
};

export type PlayerAudioTrack = {
  readonly id: string;
  getLanguageInfo(): PlayerLanguageInfo;
  toString(): string;
};

export type YtMoviePlayer = {
  getAvailableAudioTracks(): object[];
  getAudioTrack(): object | undefined;
  setAudioTrack(track: object): void;
};

export type YtPlayerUserSettingsPayload = {
  creation: number;
  data: string;
  expiration: number;
};

export type YtPlayerUserSettingsData = {
  [key: string]: { stringValue: string } | undefined;
};
