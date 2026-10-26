import { useEffect } from "react";
import { interval } from "rxjs";
import { useTranslation } from "react-i18next";
import { ToastContextType } from "../context/ToastContext.tsx";
import { Chat as ChatType } from "../types/chat.ts";

const useChatNotifyEffect = ({ toast, useStore }: { toast: ToastContextType | null; useStore: any }) => {
  const { t } = useTranslation();

  const unansweredChatsLength = useStore((state) => state.unansweredChatsLength());
  const activeChats = useStore((state) => state.activeChats);
  const userId = useStore((state) => state.userId);
  const validationChatsLength = useStore((state) => state.validationChatsLength());
  const messagesMap = useStore((state) => state.messagesMap());
  const activeChatsLength = useStore((state) => state.activeChats.length);
  const newChatPopupNotifications = useStore((state) => state.userProfileSettings.newChatPopupNotifications);
  const forwardedChatsLength = useStore((state) => state.forwordedChatsLength());
  const forwardedChatPopupNotifications = useStore((state) => state.userProfileSettings.forwardedChatPopupNotifications);

  const handleNewMessage = () => {
    if (unansweredChatsLength <= 0 && activeChatsLength <= 0) return;

    const newMessageDetected = newMessagesDetected("byk_header_chatsMessagesMap", messagesMap);
    if (newMessageDetected.newMessages) {
      const chat = activeChats.find((chat: ChatType) => chat.id === newMessageDetected.id);
      if (chat?.customerSupportId === userId || chat?.customerSupportId === "") {
        const focusedChat = localStorage.getItem("focused_chat");

        if (focusedChat === null || focusedChat !== newMessageDetected.id) {
          if (newChatPopupNotifications) {
            toast?.open({
              type: "info",
              title: t("global.notification"),
              message: t("settings.users.newUnansweredChat"),
            });
          }
        }
      }
    }
  };

  const handleForwordMessage = () => {
    if (forwardedChatsLength <= 0) {
      if (activeChats.length != 0) {
        localStorage.setItem("byk_header_forwardedChatsLength", forwardedChatsLength);
      }
      return;
    };

    if (samePreviousValue("byk_header_forwardedChatsLength", forwardedChatsLength)) return;

    if (forwardedChatPopupNotifications)
      toast?.open({
        type: "success",
        title: t("settings.users.newForwardedChatTitle"),
        message: t("settings.users.newForwardedChatMessage"),
        duration: Infinity,
      });
  };

  const handleValidationchats = () => {
    if (validationChatsLength <= 0) {
      if (activeChats.length != 0) {
        localStorage.setItem("byk_header_validationChatsLength", validationChatsLength);
      }
      return;
    }

    if (samePreviousValue("byk_header_validationChatsLength", validationChatsLength)) return;

    if (newChatPopupNotifications)
      toast?.open({
        type: "info",
        title: t("global.notification"),
        message: t("settings.users.newValidationMessage"),
      });
  };

  useEffect(() => {
    handleNewMessage();
  }, [unansweredChatsLength, activeChatsLength, messagesMap]);

  useEffect(() => {
    handleForwordMessage();
  }, [forwardedChatsLength, activeChatsLength, messagesMap]);

  useEffect(() => {
    handleValidationchats();
  }, [validationChatsLength]);

  useEffect(() => {
    const subscription = interval(2 * 60 * 1000).subscribe(() => {
      handleNewMessage();
      handleForwordMessage();
    });

    return () => subscription?.unsubscribe();
  }, []);
};

const samePreviousValue = (key: string, value: number) => {
  const previousValue = parseInt(localStorage.getItem(key) || "0");
  if (previousValue === value) return true;
  localStorage.setItem(key, value.toString());
  return false;
};

const newMessagesDetected = (key: string, currentMessagesMap: Map<string, number>) => {
  const previousMessagesMap = JSON.parse(localStorage.getItem(key) ?? "{}");

  let result = { newMessages: false, id: "" };

  for (const [id, value] of currentMessagesMap.entries()) {
    if (!previousMessagesMap[id] || previousMessagesMap[id] < value) {
      result = { newMessages: true, id };
      break;
    }
  }

  localStorage.setItem(key, JSON.stringify(Object.fromEntries(currentMessagesMap)));
  return result;
};

export default useChatNotifyEffect;
