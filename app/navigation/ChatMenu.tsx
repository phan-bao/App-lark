import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  id: string;
  createdAt: {
    toDate: () => Date;
  };
  isPinned?: boolean;
}

interface ChatMenuProps {
  messageId: string;
  text: string;
  isSender: boolean;
  message: Message;
  onReaction: (messageId: string, reaction: string) => void;
  onReply: (messageId: string, text: string, isSender: boolean) => void;
  onCopyMessage: (text: string) => void;
  onForward: (messageId: string, text: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onEdit: (messageId: string, text: string) => void;
  onClose: () => void;
}

const reactions = ['❤️', '😆', '😢', '😠', '👍'];

export default function ChatMenu({
  messageId,
  text,
  isSender,
  message,
  onReaction,
  onReply,
  onCopyMessage,
  onForward,
  onDeleteMessage,
  onPin,
  onEdit,
  onClose,
}: ChatMenuProps) {
  const canEdit = () => {
    if (!message?.createdAt) return false;
    
    const messageTime = message.createdAt.toDate();
    const currentTime = new Date();
    const timeDiff = (currentTime.getTime() - messageTime.getTime()) / (1000 * 60);
    
    return timeDiff <= 5;
  };

  return (
    <>
      <Pressable 
        style={StyleSheet.absoluteFill} 
        onPress={onClose}
      />
      <View style={[styles.reactionsMenu, isSender ? styles.senderReactions : styles.receiverReactions]}>
        <View style={styles.reactionsList}>
          {reactions.map((reaction, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.reactionButton}
              onPress={() => {
                onReaction(messageId, reaction);
                onClose();
              }}
            >
              <Text style={styles.reactionEmoji}>{reaction}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.reactionButton}>
            <Text style={styles.reactionEmoji}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.separator} />
        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => {
              onReply(messageId, text, isSender);
              onClose();
            }}
          >
            <View style={styles.optionContent}>
              <Ionicons name="return-up-back" size={22} color="#666" />
              <Text style={styles.optionText}>Trả lời</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => {
              onCopyMessage(text);
              onClose();
            }}
          >
            <View style={styles.optionContent}>
              <Ionicons name="copy-outline" size={22} color="#666" />
              <Text style={styles.optionText}>Sao chép</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => {
              onForward(messageId, text);
              onClose();
            }}
          >
            <View style={styles.optionContent}>
              <Ionicons name="arrow-redo-outline" size={22} color="#666" />
              <Text style={styles.optionText}>Chuyển tiếp</Text>
            </View>
          </TouchableOpacity>
          {isSender && canEdit() && (
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                onEdit(messageId, text);
                onClose();
              }}
            >
              <View style={styles.optionContent}>
                <Ionicons name="pencil-outline" size={22} color="#666" />
                <Text style={styles.optionText}>Chỉnh sửa</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => {
              onPin(messageId);
              onClose();
            }}
          >
            <View style={styles.optionContent}>
              <Ionicons 
                name={message.isPinned ? "pin" : "pin-outline"} 
                size={24} 
                color="#666" 
              />
              <Text style={styles.optionText}>
                {message.isPinned ? "Bỏ ghim" : "Ghim"}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => {
              onDeleteMessage(messageId);
              onClose();
            }}
          >
            <View style={styles.optionContent}>
              <Ionicons name="trash-outline" size={22} color="#FF453A" />
              <Text style={[styles.optionText, { color: '#FF453A' }]}>Xóa</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  reactionsMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    zIndex: 1000,
    bottom: '100%',
    marginBottom: 8,
    width: 240,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  senderReactions: {
    right: 0,
  },
  receiverReactions: {
    left: 0,
  },
  reactionsList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  reactionButton: {
    padding: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionEmoji: {
    fontSize: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  optionsContainer: {
    paddingVertical: 4,
  },
  optionItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  optionText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
});
