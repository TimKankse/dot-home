import React from 'react';
import { Widget } from "@/types/widget";
import { WidgetWrapper } from "@/components/WidgetWrapper";
import { ClockWidget } from "@/components/widgets/clock/ClockWidget";
import { WeatherWidget } from './widgets/weather/WeatherWidget';
import { JellyfinWidget } from "@/components/widgets/jellyfin/JellyfinWidget";
import JellyseerrWidget from "@/components/widgets/jellyseerr/JellyseerrWidget";
import { AppShortcutWidget } from "@/components/widgets/shortcut/AppShortcutWidget";
import { TwitchWidget } from "@/components/widgets/twitch/TwitchWidget";
import { SabnzbdWidget } from "@/components/widgets/sabnzbd/SabnzbdWidget";
import { GlancesWidget } from "@/components/widgets/glances/GlancesWidget";
import { NetdataWidget } from "@/components/widgets/netdata/NetdataWidget";
import { CalendarWidget } from "@/components/widgets/calendar/CalendarWidget";
import { SearchWidget } from "@/components/widgets/search/SearchWidget";
import { RssWidget } from "@/components/widgets/rss/RssWidget";
import { SpacerWidget } from "@/components/widgets/spacer/SpacerWidget";
import { PortainerWidget } from "@/components/widgets/portainer/PortainerWidget";
import { QBittorrentWidget } from "@/components/widgets/qbittorrent/QBittorrentWidget";
import { ImageWidget } from "@/components/widgets/image/ImageWidget";


interface WidgetRendererProps {
  widget: Widget;
  isEditing: boolean;
  onEdit: (widget: Widget) => void;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget, isEditing, onEdit }) => {
  const icon = widget.iconUrl ? (
    <img 
      src={widget.iconUrl} 
      alt="icon" 
      style={{ 
        width: 20, 
        height: 20, 
        objectFit: 'contain', 
        borderRadius: 4 
      }} 
    />
  ) : undefined;

  const getTitle = (defaultTitle?: string) => widget.name || defaultTitle;

  switch (widget.type) {
    case 'clock':
      return (
        <WidgetWrapper 
          title={getTitle()} 
          icon={icon} 
          isEditing={isEditing} 
          onEdit={() => onEdit(widget)}
        >
          <ClockWidget config={widget.config as any} />
        </WidgetWrapper>
      );
    case 'search':
      return (
        <WidgetWrapper 
          title={getTitle()} 
          icon={icon}
          isEditing={isEditing} 
          onEdit={() => onEdit(widget)}
        >
          <SearchWidget isEditing={isEditing} />
        </WidgetWrapper>
      );
    case 'shortcut':
      return (
        <AppShortcutWidget 
          name={widget.name || ''} 
          url={widget.url || ''} 
          iconUrl={widget.iconUrl}
          isSelfHosted={widget.isSelfHosted} 
          internalUrl={widget.internalUrl} 
          config={widget.config}
          isEditing={isEditing}
          onEdit={() => onEdit(widget)}
        />
      );
    case 'jellyfin':
      return (
        <WidgetWrapper 
          title={getTitle("Jellyfin")} 
          icon={icon} 
          isEditing={isEditing} 
          onEdit={() => onEdit(widget)}
        >
          <JellyfinWidget config={widget.config} />
        </WidgetWrapper>
      );
    case 'jellyseerr':
      return (
        <WidgetWrapper 
          title={getTitle("Media Requests")} 
          icon={icon} 
          isEditing={isEditing} 
          onEdit={() => onEdit(widget)}
        >
          <JellyseerrWidget config={widget.config} />
        </WidgetWrapper>
      );
    case 'weather':
      return (
        <WidgetWrapper 
          title={getTitle()} 
          icon={icon}
          isEditing={isEditing} 
          onEdit={() => onEdit(widget)}
        >
          <WeatherWidget config={widget.config} />
        </WidgetWrapper>
      );
    case 'twitch':
      return (
        <WidgetWrapper 
          title={getTitle()} 
          icon={icon}
          isEditing={isEditing} 
          onEdit={() => onEdit(widget)}
        >
          <TwitchWidget isEditing={isEditing} config={widget.config as any} />
        </WidgetWrapper>
      );
    case 'sabnzbd':
      return (
        <WidgetWrapper 
          title={getTitle("SABnzbd")} 
          icon={icon} 
          isEditing={isEditing} 
          onEdit={() => onEdit(widget)}
        >
          <SabnzbdWidget config={widget.config} />
        </WidgetWrapper>
      );
    case 'glances':
      return (
        <WidgetWrapper 
          title={getTitle()} 
          icon={icon}
          isEditing={isEditing} 
          onEdit={() => onEdit(widget)}
        >
          <GlancesWidget isEditing={isEditing} config={widget.config} />
        </WidgetWrapper>
      );
    case 'netdata':
      return (
        <WidgetWrapper 
          title={getTitle()} 
          icon={icon}
          isEditing={isEditing} 
          onEdit={() => onEdit(widget)}
        >
          <NetdataWidget isEditing={isEditing} config={widget.config} />
        </WidgetWrapper>
      );
    case 'calendar':
      return (
        <WidgetWrapper 
          title={getTitle()} 
          icon={icon}
          isEditing={isEditing} 
          onEdit={() => onEdit(widget)}
        >
          <CalendarWidget config={widget.config as any} />
        </WidgetWrapper>
      );
    case 'rss':
      return (
        <WidgetWrapper 
          title={getTitle()} 
          icon={icon}
          isEditing={isEditing} 
          onEdit={() => onEdit(widget)}
        >
          <RssWidget config={widget.config} />
        </WidgetWrapper>
      );
    case 'spacer':
      return (
        <WidgetWrapper 
          isEditing={isEditing} 
          onEdit={() => onEdit(widget)} 
          style={!isEditing ? { 
            background: 'transparent', 
            border: 'none', 
            boxShadow: 'none',
            pointerEvents: 'none' // Prevent hover effects
          } : undefined}
        >
          <SpacerWidget isEditing={isEditing} />
        </WidgetWrapper>
      );
    case 'portainer':
      return (
        <WidgetWrapper 
          title={getTitle("Portainer")} 
          icon={icon} 
          isEditing={isEditing} 
          onEdit={() => onEdit(widget)}
        >
          <PortainerWidget isEditing={isEditing} config={widget.config} />
        </WidgetWrapper>
      );
    case 'qbittorrent':
      return (
        <WidgetWrapper 
          title={getTitle("qBittorrent")} 
          icon={icon} 
          isEditing={isEditing} 
          onEdit={() => onEdit(widget)}
        >
          <QBittorrentWidget config={widget.config} />
        </WidgetWrapper>
      );
    case 'image':
      return (
        <WidgetWrapper 
          // title={getTitle("Image")} 
          icon={icon} 
          isEditing={isEditing} 
          onEdit={() => onEdit(widget)}
        >
          <ImageWidget config={widget.config} />
        </WidgetWrapper>
      );

    default:
      return null;
  }
};
