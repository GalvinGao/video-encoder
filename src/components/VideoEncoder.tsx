import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import {
  Alert,
  Box,
  Button,
  Card,
  Code,
  ColorInput,
  FileButton,
  Group,
  NumberInput,
  Progress,
  Radio,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle } from "@tabler/icons-react";
import { type FC, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type ScalingStrategy = "cover" | "contain" | "fill";

interface Preset {
  name: string;
  resolution: number | null;
  bitrate: string | null;
}

interface EncodingTime {
  elapsed: number;
  estimated: number;
}

const PRESETS: Preset[] = [
  { name: "标清方形", resolution: 480, bitrate: "1M" },
  { name: "高清方形", resolution: 720, bitrate: "1.5M" },
  { name: "自定义", resolution: null, bitrate: null },
];

const MIN_RESOLUTION = 100;
const MAX_RESOLUTION = 1920;
const MIN_BITRATE = 0.5;
const MAX_BITRATE = 10;
const DEFAULT_RESOLUTION = 480;
const DEFAULT_BITRATE = 1;

const ffmpeg = new FFmpeg();

const useFFmpeg = () => {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const baseURL = import.meta.env.DEV ? "https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm" : "/ffmpeg";
        ffmpeg.on("log", ({ message }) => {
          console.log(message);
          setLogs((prev) => [...prev, message]);
        });
        ffmpeg.on("progress", ({ progress }) => {
          setProgress(progress);
        });

        await ffmpeg.load({
          coreURL: `${baseURL}/ffmpeg-core.js`,
          wasmURL: `${baseURL}/ffmpeg-core.wasm`,
        });
        setLoaded(true);
      } catch (err) {
        console.error("Failed to load FFmpeg:", err);
        notifications.show({
          title: "加载 FFmpeg 失败",
          message: err instanceof Error ? err.message : "未知错误",
          color: "red",
        });
      }
    };

    load();
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return { loaded, ffmpeg, progress, logs, clearLogs };
};

const useEncodingTime = (isEncoding: boolean, progress: number): EncodingTime => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isEncoding && progress > 0) {
      const currentTime = Date.now();
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime;
      }

      const elapsed = Math.floor((currentTime - startTimeRef.current) / 1000);
      setElapsedTime(elapsed);

      if (progress > 0) {
        const estimated = Math.floor(elapsed / progress);
        setEstimatedTime(estimated);
      }
    } else if (!isEncoding) {
      startTimeRef.current = null;
      setElapsedTime(0);
      setEstimatedTime(0);
    }
  }, [progress, isEncoding]);

  return { elapsed: elapsedTime, estimated: estimatedTime };
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const validateCustomSettings = (resolution: number, bitrate: number): string | null => {
  if (resolution < MIN_RESOLUTION || resolution > MAX_RESOLUTION) {
    return `分辨率必须在${MIN_RESOLUTION}到${MAX_RESOLUTION}之间`;
  }
  if (bitrate < MIN_BITRATE || bitrate > MAX_BITRATE) {
    return `比特率必须在${MIN_BITRATE}到${MAX_BITRATE} Mbps之间`;
  }
  return null;
};

const Logs: FC<{ logs: string[] }> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 滚动条自动滚动
  useLayoutEffect(() => {
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTo({
          top: logContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 0);
  }, [logs]);

  return (
    <ScrollArea h={200} viewportRef={logContainerRef}>
      {logs.length > 0 ? (
        <Code block style={{ whiteSpace: "pre-wrap" }}>
          {logs.join("\n")}
        </Code>
      ) : (
        <Text c="dimmed" size="sm" ta="center" py="lg">
          暂无日志记录
        </Text>
      )}
    </ScrollArea>
  );
};

interface ScalingStrategyPreviewProps {
  strategy: ScalingStrategy;
  backgroundColor: string;
}

const ScalingStrategyPreview: FC<ScalingStrategyPreviewProps> = ({ strategy, backgroundColor }) => {
  // Common styles
  const containerWidth = 100;
  const originalAspectRatio = 16 / 9;
  const containerHeight = containerWidth / originalAspectRatio;
  const targetSize = containerHeight;
  const strokeWidth = 2;

  const getPreviewContent = () => {
    switch (strategy) {
      case "cover":
        // Show cropping from center
        return (
          <>
            {/* Original frame */}
            <rect
              x={0}
              y={0}
              width={containerWidth}
              height={containerHeight}
              fill="none"
              stroke="#66666666"
              strokeWidth={strokeWidth}
            />
            {/* Target square (cropped) */}
            <rect
              x={(containerWidth - targetSize) / 2}
              y={(containerHeight - targetSize) / 2}
              width={targetSize}
              height={targetSize}
              fill="#228be666"
              stroke="#228be6"
              strokeWidth={strokeWidth}
              strokeDasharray="4"
            />
          </>
        );
      case "contain": {
        // Show fitting inside with padding
        const scaledWidth = targetSize;
        const scaledHeight = scaledWidth / originalAspectRatio;
        return (
          <>
            {/* Background/padding area */}
            <rect
              x={(containerWidth - targetSize) / 2}
              y={(containerHeight - targetSize) / 2}
              width={targetSize}
              height={targetSize}
              fill={backgroundColor}
              stroke="#228be6"
              strokeWidth={strokeWidth}
              strokeDasharray="4"
            />
            {/* Scaled video */}
            <rect
              x={(containerWidth - scaledWidth) / 2}
              y={(containerHeight - scaledHeight) / 2}
              width={scaledWidth}
              height={scaledHeight}
              fill="#ffffff66"
              stroke="#ffffff66"
              strokeWidth={strokeWidth}
            />
          </>
        );
      }
    }
  };

  return (
    <Box>
      <svg
        width={containerWidth}
        height={containerHeight}
        viewBox={`${-strokeWidth} ${-strokeWidth} ${containerWidth + strokeWidth * 2} ${containerHeight + strokeWidth * 2}`}
        style={{ display: "block", margin: "0 auto" }}
      >
        <title>{`${strategy} 缩放策略预览`}</title>
        {getPreviewContent()}
      </svg>
      <Text size="xs" c="dimmed" ta="center" mt="xs">
        {strategy === "cover" ? "原始视频将被裁切以填充目标尺寸" : "保持原始比例，添加背景色填充"}
      </Text>
    </Box>
  );
};

interface ScalingOptionCardProps {
  value: ScalingStrategy;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: ScalingStrategy) => void;
  disabled: boolean;
  backgroundColor: string;
  children?: React.ReactNode;
}

const ScalingOptionCard: FC<ScalingOptionCardProps> = ({
  value,
  label,
  description,
  checked,
  onChange,
  disabled,
  backgroundColor,
  children,
}) => {
  return (
    <Radio.Card
      value={value}
      checked={checked}
      onClick={() => onChange(value)}
      disabled={disabled}
      p="md"
      radius="md"
      style={{
        display: "flex",
        alignItems: "flex-start",
        borderColor: checked ? "var(--mantine-primary-color-filled)" : undefined,
      }}
      withBorder
    >
      <Group wrap="nowrap" align="flex-start" mr="lg">
        <Radio.Indicator />
        <div>
          <Text fw={500} mb={4}>
            {label}
          </Text>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
          {children}
        </div>
      </Group>

      <ScalingStrategyPreview strategy={value} backgroundColor={backgroundColor} />
    </Radio.Card>
  );
};

const VideoEncoder: FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESETS[0].name);
  const [customResolution, setCustomResolution] = useState<number>(DEFAULT_RESOLUTION);
  const [customBitrate, setCustomBitrate] = useState<number>(DEFAULT_BITRATE);
  const [file, setFile] = useState<File | null>(null);
  const [isEncoding, setIsEncoding] = useState(false);
  const [scalingStrategy, setScalingStrategy] = useState<ScalingStrategy>("cover");
  const [backgroundColor, setBackgroundColor] = useState("#000000");
  const [encodedVideoUrl, setEncodedVideoUrl] = useState<string | null>(null);

  const { loaded, ffmpeg, progress, logs, clearLogs } = useFFmpeg();
  const { elapsed: elapsedTime, estimated: estimatedTime } = useEncodingTime(isEncoding, progress);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "视频正在编码中，确定要离开吗？";
      return "视频正在编码中，确定要离开吗？";
    };

    if (isEncoding) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    } else {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isEncoding]);

  useEffect(() => {
    const currentUrl = encodedVideoUrl;
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [encodedVideoUrl]);

  const handleFileSelect = (selectedFile: File | null) => {
    if (encodedVideoUrl) {
      setEncodedVideoUrl(null);
    }
    setFile(selectedFile);
  };

  const getScalingFilter = useCallback(
    (resolution: number): string => {
      if (scalingStrategy === "cover") {
        return `crop=min(iw\\,ih):min(iw\\,ih),scale=${resolution}:${resolution}`;
      }

      return `scale=${resolution}:${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:${resolution}:-1:-1:color=${backgroundColor.replace("#", "0x")}`;
    },
    [scalingStrategy, backgroundColor],
  );

  const handleEncode = useCallback(async () => {
    if (!file || !loaded) return;

    if (encodedVideoUrl) {
      setEncodedVideoUrl(null);
    }

    const preset = PRESETS.find((p) => p.name === selectedPreset);
    if (!preset) return;

    if (preset.name === "自定义") {
      const error = validateCustomSettings(customResolution, customBitrate);
      if (error) {
        notifications.show({
          title: "错误",
          message: error,
          color: "red",
        });
        return;
      }
    }

    try {
      setIsEncoding(true);
      clearLogs();

      await ffmpeg.writeFile("input.mp4", await fetchFile(file));

      const resolution = preset.name === "自定义" ? customResolution : preset.resolution;
      const bitrate = preset.name === "自定义" ? `${customBitrate}M` : preset.bitrate || "1M";

      if (!resolution) {
        throw new Error("Resolution is not set");
      }

      await ffmpeg.exec([
        "-i",
        "input.mp4",
        "-filter:v",
        getScalingFilter(resolution),
        "-b:v",
        bitrate,
        "-c:a",
        "copy",
        "output.mp4",
      ]);

      const data = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([data], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setEncodedVideoUrl(url);

      const fileNameWithoutExt = file.name.split(".")[0];

      const a = document.createElement("a");
      a.href = url;
      a.download = `encoded_${fileNameWithoutExt}.mp4`;
      a.click();

      notifications.show({
        title: "成功",
        message: "视频编码完成！",
        color: "green",
      });
    } catch (err) {
      console.error("Failed to encode video:", err);
      notifications.show({
        title: "错误",
        message: "视频编码失败",
        color: "red",
      });
    } finally {
      setIsEncoding(false);
    }
  }, [
    file,
    ffmpeg,
    loaded,
    selectedPreset,
    customResolution,
    customBitrate,
    clearLogs,
    getScalingFilter,
    encodedVideoUrl,
  ]);

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder w="100%">
      <Stack>
        <Title order={2}>视频重编码</Title>

        <Stack gap="4" align="flex-start">
          <Group>
            <FileButton onChange={handleFileSelect} accept="video/*,image/*">
              {(props) => (
                <Button {...props} variant={file ? "light" : "filled"} disabled={isEncoding} size="lg">
                  {file ? "更换视频/图片" : "选择视频/图片..."}
                </Button>
              )}
            </FileButton>

            {file && (
              <Text size="sm" c="dimmed">
                {file.name}
              </Text>
            )}
          </Group>

          <Text size="xs" c="dimmed">
            支持范围包含 ffmpeg 支持的所有格式；同时支持视频、动图与图片格式，例如 mp4, mov, avi, mkv, flv, webm, webp,
            gif, png, jpg, jpeg, bmp, tiff, heic, heif 等
          </Text>
        </Stack>

        <Radio.Group
          value={selectedPreset}
          onChange={setSelectedPreset}
          name="preset"
          label="输出质量"
          description="分辨率与码率"
          withAsterisk
        >
          <Stack mt="xs">
            {PRESETS.map((preset) => (
              <Radio
                key={preset.name}
                value={preset.name}
                label={
                  preset.name === "自定义"
                    ? "自定义"
                    : `${preset.name} (${preset.resolution}×${preset.resolution}, ${preset.bitrate}bps)`
                }
                disabled={isEncoding}
                style={{
                  fontVariant: "tabular-nums",
                }}
              />
            ))}
          </Stack>
        </Radio.Group>

        {selectedPreset === "自定义" && (
          <Card padding="sm" radius="md" withBorder w="100%">
            <SimpleGrid cols={2}>
              <NumberInput
                label="分辨率"
                description="输入方形分辨率（例如：480表示480x480）"
                placeholder="输入分辨率"
                min={MIN_RESOLUTION}
                max={MAX_RESOLUTION}
                value={customResolution}
                onChange={(val) => setCustomResolution(typeof val === "number" ? val : DEFAULT_RESOLUTION)}
                disabled={isEncoding}
                error={
                  customResolution < MIN_RESOLUTION || customResolution > MAX_RESOLUTION
                    ? `分辨率必须在${MIN_RESOLUTION}到${MAX_RESOLUTION}之间`
                    : null
                }
              />
              <NumberInput
                label="比特率"
                description="输入比特率（Mbps）（例如：1.5表示1.5 Mbps）"
                placeholder="输入比特率"
                min={MIN_BITRATE}
                max={MAX_BITRATE}
                step={0.1}
                value={customBitrate}
                onChange={(val) => setCustomBitrate(typeof val === "number" ? val : DEFAULT_BITRATE)}
                disabled={isEncoding}
                error={
                  customBitrate < MIN_BITRATE || customBitrate > MAX_BITRATE
                    ? `比特率必须在${MIN_BITRATE}到${MAX_BITRATE} Mbps之间`
                    : null
                }
              />
            </SimpleGrid>
          </Card>
        )}

        <Radio.Group
          value={scalingStrategy}
          onChange={(value) => setScalingStrategy(value as ScalingStrategy)}
          name="scalingStrategy"
          label="缩放策略"
          withAsterisk
        >
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="xs">
            <ScalingOptionCard
              value="cover"
              label="裁切填充 (Cover)"
              description="从中心裁切视频以填充整个画面，保持画面比例但可能裁剪掉部分内容"
              checked={scalingStrategy === "cover"}
              onChange={setScalingStrategy}
              disabled={isEncoding}
              backgroundColor={backgroundColor}
            />
            <ScalingOptionCard
              value="contain"
              label="包含 (Contain)"
              description="保持原始视频比例，根据需要在边缘添加背景色填充"
              checked={scalingStrategy === "contain"}
              onChange={setScalingStrategy}
              disabled={isEncoding}
              backgroundColor={backgroundColor}
            >
              <ColorInput
                mt="xs"
                opacity={scalingStrategy === "contain" ? 1 : 0.2}
                size="xs"
                label="填充背景色"
                value={backgroundColor}
                onChange={setBackgroundColor}
                disabled={isEncoding}
              />
            </ScalingOptionCard>
          </SimpleGrid>
        </Radio.Group>

        <Group gap="lg" justify="center">
          <Group gap="xs">
            <svg width={26} viewBox="0 0 26 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <title>输出画面</title>
              <rect
                x="1"
                y="1"
                width="24"
                height="8"
                stroke="#228be6"
                fill="#228be666"
                strokeDasharray="4"
                strokeWidth={2}
              />
            </svg>

            <Text size="xs" c="dimmed">
              输出画面
            </Text>
          </Group>

          <Group gap="xs">
            <svg width={26} viewBox="0 0 26 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <title>原画面</title>
              <rect x="1" y="1" width="24" height="8" fill="#999" stroke="#66666666" strokeWidth={2} />
            </svg>

            <Text size="xs" c="dimmed">
              原画面
            </Text>
          </Group>
        </Group>

        <Button size="lg" onClick={handleEncode} loading={isEncoding} disabled={!file || !loaded} fullWidth>
          {loaded ? (file ? "开始编码" : "选择视频以开始编码") : "加载 FFmpeg 中..."}
        </Button>

        {encodedVideoUrl && !isEncoding && file && (
          <Button
            mt="md"
            size="lg"
            variant="outline"
            onClick={() => {
              const a = document.createElement("a");
              a.href = encodedVideoUrl;
              a.download = `encoded_${file.name}`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
            fullWidth
          >
            重新下载已编码视频 ({file.name})
          </Button>
        )}

        {(logs.length > 0 || isEncoding) && (
          <Stack>
            {isEncoding && (
              <>
                <Alert variant="light" color="blue" title="提示" icon={<IconInfoCircle />}>
                  编码过程可能会消耗大量时间，请耐心等待；
                  <br />
                  编码过程请不要最小化窗口或将标签页置于后台，否则可能会导致编码失败。
                </Alert>

                <Progress.Root size={36}>
                  <Tooltip label={`${Math.round(progress * 100)}%; 已编码 ${formatTime(elapsedTime)}`}>
                    <Progress.Section striped animated value={progress * 100}>
                      <Progress.Label>{`${Math.round(progress * 100)}%; 已编码 ${formatTime(elapsedTime)}`}</Progress.Label>
                    </Progress.Section>
                  </Tooltip>
                  <Tooltip label={`预计剩余 ${formatTime(Math.max(estimatedTime - elapsedTime, 1))}`}>
                    <Progress.Section value={(1 - progress) * 100} color="transparent">
                      <Progress.Label>{`预计剩余 ${formatTime(Math.max(estimatedTime - elapsedTime, 1))}`}</Progress.Label>
                    </Progress.Section>
                  </Tooltip>
                </Progress.Root>
              </>
            )}

            {logs.length > 0 && (
              <>
                <Group justify="space-between" align="center">
                  <Text size="sm" fw={500}>
                    编码日志
                  </Text>
                  <Group gap="xs">
                    <Button variant="subtle" size="xs" onClick={clearLogs} disabled={logs.length === 0}>
                      清除日志
                    </Button>
                    <Button
                      variant="light"
                      size="xs"
                      onClick={() => {
                        const blob = new Blob([logs.join("\n")], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "编码日志.txt";
                        a.click();
                      }}
                    >
                      下载日志
                    </Button>
                  </Group>
                </Group>

                <Logs logs={logs} />
              </>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  );
};

export default VideoEncoder;
