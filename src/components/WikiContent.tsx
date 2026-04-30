import { Text, type TextStyle } from "react-native";
import { router } from "expo-router";
import { theme } from "../lib/theme";

interface WikiContentProps {
  content: string;
  style?: TextStyle;
}

interface Segment {
  type: "text" | "link";
  value: string;
}

function parseWikiContent(content: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /\[\[(.+?)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "link", value: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  return segments;
}

export function WikiContent({ content, style }: WikiContentProps) {
  const segments = parseWikiContent(content);

  return (
    <Text style={[defaultStyle, style]}>
      {segments.map((seg, i) =>
        seg.type === "link" ? (
          <Text
            key={i}
            style={linkStyle}
            onPress={() =>
              router.push(
                `/wiki/${encodeURIComponent(seg.value.toLowerCase().trim())}`
              )
            }
          >
            {seg.value}
          </Text>
        ) : (
          <Text key={i}>{seg.value}</Text>
        )
      )}
    </Text>
  );
}

const defaultStyle: TextStyle = {
  fontSize: theme.font.size.sm,
  color: theme.colors.textDim,
  lineHeight: 22,
};

const linkStyle: TextStyle = {
  color: theme.colors.accent,
  textDecorationLine: "underline",
};
