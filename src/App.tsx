import { Affix, Container, MantineProvider, Text } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import VideoEncoder from "./components/VideoEncoder";

export default function App() {
  return (
    <MantineProvider defaultColorScheme="auto">
      <Notifications />
      <Container size="md" py="xl">
        <VideoEncoder />
      </Container>
      <Affix position={{ bottom: 20, right: 20 }}>
        <Text size="xs" c="dimmed">
          沪ICP备2020032125号
        </Text>
      </Affix>
    </MantineProvider>
  );
}
