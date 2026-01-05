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

export interface JellyfinWidgetConfig {
  url?: string;
  apiKey?: string;
  userId?: string;
  viewMode?: string;
}
