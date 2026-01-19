import type { JellyfinWidgetConfig } from '@/types';

export interface MediaStream {
  Type: 'Video' | 'Audio' | 'Subtitle';
  Codec?: string;
  CodecTag?: string;
  Language?: string;
  Title?: string;
  DisplayTitle?: string;
  // Video specific
  Width?: number;
  Height?: number;
  AspectRatio?: string;
  BitRate?: number;
  BitDepth?: number;
  VideoRange?: string;
  VideoRangeType?: string;
  // Audio specific
  Channels?: number;
  ChannelLayout?: string;
  SampleRate?: number;
}

export interface JellyfinSession {
  Id: string;
  UserName: string;
  DeviceName: string;
  Client: string;
  NowPlayingItem?: {
    Id: string;
    SeriesId?: string;
    Name: string;
    SeriesName?: string;
    EpisodeTitle?: string;
    RunTimeTicks?: number;
    Type: 'Movie' | 'Episode' | 'TvChannel';
    ImageTags?: {
        Primary?: string;
    };
    MediaStreams?: MediaStream[];
  };
  PlayState?: {
    PositionTicks?: number;
    IsPaused?: boolean;
    PlayMethod?: string;
  };
  TranscodingInfo?: {
    AudioCodec?: string;
    VideoCodec?: string;
    IsVideoDirect?: boolean;
    IsAudioDirect?: boolean;
    Bitrate?: number;
    Container?: string;
    Framerate?: number;
    Width?: number;
    Height?: number;
    AudioChannels?: number;
    TranscodeReasons?: string[];
  };
}

export interface LibraryStats {
  Id: string;
  Name: string;
  CollectionType: string;
  Counts: {
    Movies?: number;
    Series?: number;
    Episodes?: number;
  };
  TotalSize: number;
}

// Re-export from centralized types for convenience
export type { JellyfinWidgetConfig };
