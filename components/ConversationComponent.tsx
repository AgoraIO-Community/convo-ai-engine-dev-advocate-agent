'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useRTCClient,
  useLocalMicrophoneTrack,
  useRemoteUsers,
  useClientEvent,
  useIsConnected,
  useJoin,
  usePublish,
  RemoteUser,
  UID,
} from 'agora-rtc-react';
import { MicrophoneButton } from './MicrophoneButton';
import { MicrophoneSelector } from './MicrophoneSelector';
import { AudioVisualizer } from './AudioVisualizer';
import type {
  ConversationComponentProps,
  ClientStartRequest,
} from '@/types/conversation';
import ConvoTextStream from './ConvoTextStream';
import {
  MessageEngine,
  IMessageListItem,
  EMessageStatus,
  EMessageEngineMode,
} from '@/lib/message';

// Export EMessageStatus for use in other components
export { EMessageStatus } from '@/lib/message';

const MESSAGE_BUFFER: { [key: string]: string } = {};

export default function ConversationComponent({
  agoraData,
  onTokenWillExpire,
  onEndConversation,
}: ConversationComponentProps) {
  const client = useRTCClient();
  const isConnected = useIsConnected();
  const remoteUsers = useRemoteUsers();
  const [isEnabled, setIsEnabled] = useState(true);
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(isEnabled);
  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const agentUID = process.env.NEXT_AGENT_UID;
  const [joinedUID, setJoinedUID] = useState<UID>(0);
  const [messageList, setMessageList] = useState<IMessageListItem[]>([]);
  const [currentInProgressMessage, setCurrentInProgressMessage] =
    useState<IMessageListItem | null>(null);
  const messageEngineRef = useRef<MessageEngine | null>(null);

  // Check if agent UID is properly set
  useEffect(() => {
    if (!agentUID) {
      console.warn('NEXT_AGENT_UID environment variable is not set');
    } else {
      console.log('Agent UID is set to:', agentUID);
    }
  }, [agentUID]);

  // Join the channel using the useJoin hook
  const { isConnected: joinSuccess } = useJoin(
    {
      appid: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
      channel: agoraData.channel,
      token: agoraData.token,
      uid: parseInt(agoraData.uid),
    },
    true
  );

  // Initialize MessageEngine when client is ready and connected
  useEffect(() => {
    // Only initialize when the client is connected
    if (!client || !isConnected) return;

    // First, clean up any existing instance
    if (messageEngineRef.current) {
      console.log('Cleaning up existing MessageEngine instance');
      try {
        messageEngineRef.current.teardownInterval();
        messageEngineRef.current.cleanup();
      } catch (err) {
        console.error('Error cleaning up MessageEngine:', err);
      }
      messageEngineRef.current = null;
    }

    console.log('Creating new MessageEngine instance with connected client');

    // Create message engine with TEXT mode for better compatibility
    try {
      const messageEngine = new MessageEngine(
        client,
        EMessageEngineMode.TEXT, // Use TEXT mode for more reliable message handling
        // Callback to handle message list updates
        (updatedMessages: IMessageListItem[]) => {
          console.log('MessageEngine update:', updatedMessages);

          // Sort messages by turn_id to maintain order
          const sortedMessages = [...updatedMessages].sort(
            (a, b) => a.turn_id - b.turn_id
          );

          // Find the latest in-progress message
          const inProgressMsg = sortedMessages.find(
            (msg) => msg.status === EMessageStatus.IN_PROGRESS
          );

          // Debug UID issues
          if (sortedMessages.length > 0) {
            console.log(
              'Message UIDs:',
              sortedMessages.map((m) => m.uid)
            );
            console.log('Agent UID (for comparison):', agentUID);
          }

          // Update states
          setMessageList(
            sortedMessages.filter(
              (msg) => msg.status !== EMessageStatus.IN_PROGRESS
            )
          );
          setCurrentInProgressMessage(inProgressMsg || null);
        }
      );

      messageEngineRef.current = messageEngine;

      // Start the MessageEngine after client is connected
      console.log('Starting MessageEngine...');
      messageEngineRef.current.run({ legacyMode: false });
      console.log('MessageEngine successfully initialized and running');
    } catch (error) {
      console.error('Failed to initialize MessageEngine:', error);
    }

    // Cleanup on state change
    return () => {
      if (messageEngineRef.current) {
        console.log('Cleaning up MessageEngine on state change');
        try {
          messageEngineRef.current.teardownInterval();
          messageEngineRef.current.cleanup();
        } catch (err) {
          console.error('Error cleaning up MessageEngine:', err);
        }
        messageEngineRef.current = null;
      }
    };
  }, [client, agentUID, isConnected]); // Add isConnected dependency

  // Add improved stream message handler
  useClientEvent(client, 'stream-message', (uid, payload) => {
    const uidStr = uid.toString();
    const isAgentMessage = uidStr === '333'; // Use fixed value as this appears to be consistent

    console.log(
      `Received stream message from UID: ${uidStr}`,
      isAgentMessage ? 'AGENT MESSAGE' : '',
      `(Expected agent UID: ${agentUID})`,
      `Payload size: ${payload.length}`
    );

    // Check if message engine is running and try to restart if needed
    if (messageEngineRef.current) {
      console.log('MessageEngine is initialized');

      // If MessageEngine is not properly handling messages, force restart
      // Use a flag to avoid multiple restarts
      let needsRestart = false;

      // Intercept console error messages about message service not running
      const originalConsoleError = console.error;
      console.error = function (...args) {
        const errorMsg = args.join(' ');
        if (errorMsg.includes('Message service is not running')) {
          needsRestart = true;
        }
        originalConsoleError.apply(console, args);
      };

      // Try to use the message engine to handle the message
      try {
        if (isAgentMessage) {
          messageEngineRef.current.handleStreamMessage(payload);
          console.log('Processed agent message through MessageEngine');
        }
      } catch (error) {
        console.error('Error processing stream message:', error);
        needsRestart = true;
      }

      // Restore original console.error
      console.error = originalConsoleError;

      // If needed, restart the message engine after a short delay
      if (needsRestart) {
        setTimeout(() => {
          console.log('Attempting to restart MessageEngine...');
          try {
            messageEngineRef.current?.run({ legacyMode: false });
            console.log('MessageEngine restarted successfully');
          } catch (error) {
            console.error('Failed to restart MessageEngine:', error);
          }
        }, 50);
      }
    } else {
      console.error('MessageEngine not initialized!');
    }

    // Check if this is likely the agent but UID doesn't match expected
    if (isAgentMessage && uidStr !== agentUID) {
      console.warn(
        `Possible agent UID mismatch. Message from: ${uidStr}, Expected: ${agentUID}`
      );
      // Update environment config if needed
      console.info(
        `You may need to set NEXT_AGENT_UID=${uidStr} in your .env file`
      );
    }
  });

  // Update actualUID when join is successful
  useEffect(() => {
    if (joinSuccess && client) {
      const uid = client.uid;
      setJoinedUID(uid as UID);
      console.log('Join successful, using UID:', uid);
    }
  }, [joinSuccess, client]);

  // Publish local microphone track
  usePublish([localMicrophoneTrack]);

  // Ensure local track is enabled for testing
  useEffect(() => {
    if (localMicrophoneTrack) {
      localMicrophoneTrack.setEnabled(true);
    }
  }, [localMicrophoneTrack]);

  // Handle remote user events
  useClientEvent(client, 'user-joined', (user) => {
    console.log('Remote user joined:', user.uid);
    if (user.uid.toString() === agentUID) {
      setIsAgentConnected(true);
      setIsConnecting(false);
    }
  });

  useClientEvent(client, 'user-left', (user) => {
    console.log('Remote user left:', user.uid);
    if (user.uid.toString() === agentUID) {
      setIsAgentConnected(false);
      setIsConnecting(false);
    }
  });

  // Sync isAgentConnected with remoteUsers
  useEffect(() => {
    const isAgentInRemoteUsers = remoteUsers.some(
      (user) => user.uid.toString() === agentUID
    );
    setIsAgentConnected(isAgentInRemoteUsers);
  }, [remoteUsers, agentUID]);

  // Connection state changes
  useClientEvent(client, 'connection-state-change', (curState, prevState) => {
    console.log(`Connection state changed from ${prevState} to ${curState}`);

    if (curState === 'DISCONNECTED') {
      console.log('Attempting to reconnect...');
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      client?.leave();
    };
  }, [client]);


  const handleStartConversation = async () => {
    if (!agoraData.agentId) return;
    setIsConnecting(true);

    try {
      const startRequest: ClientStartRequest = {
        requester_id: joinedUID?.toString(),
        channel_name: agoraData.channel,
        input_modalities: ['text'],
        output_modalities: ['text', 'audio'],
      };

      const response = await fetch('/api/invite-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(startRequest),
      });

      if (!response.ok) {
        throw new Error(`Failed to start conversation: ${response.statusText}`);
      }

      // Update agent ID when new agent is connected
      const data = await response.json();
      if (data.agent_id) {
        agoraData.agentId = data.agent_id;
      }
    } catch (error) {
      if (error instanceof Error) {
        console.warn('Error starting conversation:', error.message);
      }
      // Reset connecting state if there's an error
      setIsConnecting(false);
    }
  };

  // Toggle microphone functionality
  const handleMicrophoneToggle = async (isOn: boolean) => {
    setIsEnabled(isOn);

    if (isOn && !isAgentConnected) {
      // Start conversation when microphone is turned on
      await handleStartConversation();
    }
  };

  // Add token renewal handler
  const handleTokenWillExpire = useCallback(async () => {
    if (!onTokenWillExpire || !joinedUID) return;
    try {
      const newToken = await onTokenWillExpire(joinedUID.toString());
      await client?.renewToken(newToken);
      console.log('Successfully renewed Agora token');
    } catch (error) {
      console.error('Failed to renew Agora token:', error);
    }
  }, [client, onTokenWillExpire, joinedUID]);

  // Add token observer
  useClientEvent(client, 'token-privilege-will-expire', handleTokenWillExpire);

  // Debug remote users to ensure we have the right agent UID
  useEffect(() => {
    if (remoteUsers.length > 0) {
      console.log(
        'Remote users detected:',
        remoteUsers.map((u) => u.uid)
      );
      console.log('Current NEXT_AGENT_UID:', agentUID);

      // If we see UIDs that don't match our expected agent UID
      const potentialAgents = remoteUsers.map((u) => u.uid.toString());
      if (agentUID && !potentialAgents.includes(agentUID)) {
        console.warn(
          'Agent UID mismatch! Expected:',
          agentUID,
          'Available users:',
          potentialAgents
        );
        console.info(
          `Consider updating NEXT_AGENT_UID to one of: ${potentialAgents.join(
            ', '
          )}`
        );
      }
    }
  }, [remoteUsers, agentUID]);

  return (
    <div className="flex flex-col gap-6 p-4 h-full">
      {/* Connection Status - Always show End Conversation button */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={onEndConversation}
          className="px-4 py-2 bg-transparent text-red-500 rounded-full border border-red-500 backdrop-blur-sm
          hover:bg-red-500 hover:text-black transition-all duration-300 shadow-lg hover:shadow-red-500/20 text-sm font-medium"
        >
          End Conversation
        </button>
        <div
          className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
      </div>

      {/* Remote Users Section - Moved to top */}
      <div className="flex-1">
        {remoteUsers.map((user) => (
          <div key={user.uid}>
            <AudioVisualizer track={user.audioTrack} />
            <RemoteUser user={user} />
          </div>
        ))}

        {remoteUsers.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Waiting for AI agent to join...
          </div>
        )}
      </div>

      {/* Local Controls - Fixed at bottom center */}
      <div className="fixed bottom-14 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <MicrophoneButton
          isEnabled={isEnabled}
          setIsEnabled={setIsEnabled}
          localMicrophoneTrack={localMicrophoneTrack}
        />
        <MicrophoneSelector localMicrophoneTrack={localMicrophoneTrack} />
      </div>

      {/* Conversation Text Stream component */}
      <ConvoTextStream
        messageList={messageList}
        currentInProgressMessage={currentInProgressMessage}
        agentUID={agentUID}
      />
    </div>
  );
}
