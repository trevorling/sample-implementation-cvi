import { create } from "zustand";
import { UserInfo } from "../types/userInfo";
import { Chat, CHAT_STATUS, Chat as ChatType, GroupedChat, GroupedPendingChat } from "../types/chat";
import apiDev from "../services/api-dev.ts";
import { UserProfileSettings } from "../types/userProfileSettings.ts";
import { isValidationsEnabled, multiDomainEnabled } from "../constants/config.ts";
import {filterChatsByDomains} from "../services/domainUtils";

type CsaStatusType = "idle" | "offline" | "online";

interface StoreState {
  userInfo: UserInfo | null;
  userId: string;
  activeChats: ChatType[];
  pendingChats: ChatType[];
  validationChats: Chat[];
  selectedChatId: string | null;
  chatCsaActive: boolean;
  csaStatus: CsaStatusType;
  csaStatusComment: string;
  setCsaStatus: (status: CsaStatusType) => void;
  setActiveChats: (chats: ChatType[]) => void;
  setPendingChats: (chats: ChatType[]) => void;
  setValidationChats: (chats: Chat[]) => void;
  setUserInfo: (info: UserInfo) => void;
  setSelectedChatId: (id: string | null) => void;
  setChatCsaActive: (active: boolean) => void;
  setCsaStatusComment: (comment: string) => void;
  selectedChat: () => ChatType | null | undefined;
  selectedPendingChat: () => ChatType | null | undefined;
  selectedValidationChat: () => ChatType | null | undefined;
  unansweredChats: () => ChatType[];
  forwordedChats: () => ChatType[];
  unansweredChatsLength: () => number;
  messagesMap: () => Map<string, number>;
  forwordedChatsLength: () => number;
  pendingChatsLength: () => number;
  validationChatsLength: () => number;
  userDomains: string[];
  setUserDomains: (domains: string[]) => void;
  activeChatsLength: () => number;
  loadActiveChats: () => Promise<void>;
  getGroupedActiveChats: () => GroupedChat;
  getGroupedUnansweredChats: () => GroupedChat;
  loadPendingChats: () => Promise<void>;
  loadValidationChats: () => Promise<void>;
  getGroupedPendingChats: () => GroupedPendingChat;
  getValidationChats: () => Chat[];
  userProfileSettings: UserProfileSettings;
  setUserProfileSettings: (settings: UserProfileSettings) => void;
}

const useStore = create<StoreState>((set, get, _) => ({
  userInfo: null,
  userId: "",
  activeChats: [],
  pendingChats: [],
  validationChats: [],
  selectedChatId: null,
  chatCsaActive: false,
  userProfileSettings: {
    userId: 1,
    forwardedChatPopupNotifications: true,
    forwardedChatSoundNotifications: true,
    forwardedChatEmailNotifications: false,
    useAutocorrect: true,
  },
  csaStatus: "online",
  userDomains: [],
  csaStatusComment: "",
  setCsaStatus: (csaStatus) => set({ csaStatus }),
  setUserProfileSettings: (settings) => set({ userProfileSettings: settings }),
  setActiveChats: (chats) => set({ activeChats: chats }),
  setPendingChats: (chats) => set({ pendingChats: chats }),
  setValidationChats: (chats) => set({ validationChats: chats }),
  setUserInfo: (data) => set({ userInfo: data, userId: data?.idCode || "" }),
  setSelectedChatId: (id) => set({ selectedChatId: id }),
  setCsaStatusComment: (comment) => set({ csaStatusComment: comment }),
  setUserDomains: (data: string[]) => set({ userDomains: data}),
  setChatCsaActive: (active) => {
    set({
      chatCsaActive: active,
    });
    get().loadActiveChats();
    get().loadPendingChats();
    if (isValidationsEnabled) get().loadValidationChats();
  },
  selectedChat: () => {
    const selectedChatId = get().selectedChatId;
    return get().activeChats.find((c) => c.id === selectedChatId);
  },
  selectedPendingChat: () => {
    const selectedChatId = get().selectedChatId;
    return get().pendingChats.find((c) => c.id === selectedChatId);
  },
  selectedValidationChat: () => {
    const selectedChatId = get().selectedChatId;
    return get().validationChats.find((c) => c.id === selectedChatId);
  },
  unansweredChats: () => {
  if (multiDomainEnabled) {
      return filterChatsByDomains(get().activeChats, get().userDomains,c => c.customerSupportId === "")
    }
    return get().activeChats.filter((c) => c.customerSupportId === "");
  },
  forwordedChats: () => {
    const userId = get().userId;
    return get().activeChats.filter((c) => c.status === CHAT_STATUS.REDIRECTED && c.customerSupportId === userId) || [];
  },
  unansweredChatsLength: () => get().unansweredChats().length,
  forwordedChatsLength: () => get().forwordedChats().length,
  pendingChatsLength: () => get().pendingChats.length,
  validationChatsLength: () => get().validationChats.length,
  activeChatsLength: () => {
    return get().activeChats.filter((c) => c.customerSupportId !== "").length;
  },
  messagesMap: () => {
    const map = new Map<string, number>();

    get().activeChats.forEach((chat) => {
      if (chat.id && chat.customerMessages !== undefined) {
        map.set(chat.id, chat.customerMessages);
      }
    });

    return map;
  },

  loadActiveChats: async () => {
    const res = await apiDev.get("agents/chats/active");
    const chats: ChatType[] = res.data.response ?? [];
    const selectedChatId = get().selectedChatId;
    const isChatStillExists = chats?.filter((e: any) => e.id === selectedChatId);
    if (isChatStillExists.length === 0 && get().activeChats.length > 0) {
      setTimeout(() => get().setActiveChats(chats), 3000);
    } else {
      get().setActiveChats(chats);
    }
  },
  loadPendingChats: async () => {
    const res = await apiDev.get("agents/chats/pending");
    const chats: ChatType[] = res.data.response ?? [];
    const selectedChatId = get().selectedChatId;
    const isChatStillExists = chats?.filter((e: any) => e.id === selectedChatId);
    if (isChatStillExists.length === 0 && get().pendingChats.length > 0) {
      setTimeout(() => get().setPendingChats(multiDomainEnabled ? filterChatsByDomains(chats, get().userDomains) : chats), 3000);
    } else {
      get().setPendingChats(multiDomainEnabled ? filterChatsByDomains(chats, get().userDomains) : chats);
    }
  },
  loadValidationChats: async () => {
    const res = await apiDev.get("chats/validations");
    const chats: Chat[] = res.data.response ?? [];
    get().setValidationChats(chats);
  },
  getGroupedActiveChats: () => {
    const activeChats = multiDomainEnabled ? filterChatsByDomains(get().activeChats,get().userDomains) : get().activeChats;
    const userInfo = get().userInfo;
    const chatCsaActive = get().chatCsaActive;

    const grouped: GroupedChat = {
      myChats: [],
      otherChats: [],
    };

    if (!activeChats) return grouped;

    if (chatCsaActive === false && !userInfo?.authorities.includes("ROLE_ADMINISTRATOR")) {
      if (get().selectedChatId !== null) {
        get().setSelectedChatId(null);
      }
      return grouped;
    }

    activeChats.forEach((c) => {
      if (c.customerSupportId === userInfo?.idCode) {
        grouped.myChats.push(c);
        return;
      }

      const groupIndex = grouped.otherChats.findIndex((x) => x.groupId === c.customerSupportId);

      if (c.customerSupportId !== "") {
        if (groupIndex === -1) {
          grouped.otherChats.push({
            groupId: c.customerSupportId ?? "",
            name: c.customerSupportDisplayName ?? "",
            chats: [c],
          });
        } else {
          grouped.otherChats[groupIndex].chats.push(c);
        }
      }
    });

    grouped.otherChats.sort((a, b) => a.name.localeCompare(b.name));
    return grouped;
  },

  getGroupedUnansweredChats: () => {
    const activeChats = multiDomainEnabled ? filterChatsByDomains(get().activeChats,get().userDomains) : get().activeChats;
    const userInfo = get().userInfo;
    const chatCsaActive = get().chatCsaActive;

    const grouped: GroupedChat = {
      myChats: [],
      otherChats: [],
    };

    if (!activeChats) return grouped;

    if (chatCsaActive === true) {
      activeChats.forEach((c) => {
        if (c.customerSupportId === "") {
          grouped.myChats.push(c);
          return;
        }
      });
    } else {
      activeChats.forEach((c) => {
        if (c.customerSupportId === userInfo?.idCode || c.customerSupportId === "") {
          grouped.myChats.push(c);
          return;
        }

        grouped.myChats.sort((a, b) => a.created.localeCompare(b.created));
        const groupIndex = grouped.otherChats.findIndex((x) => x.groupId === c.customerSupportId);
        if (c.customerSupportId !== "") {
          if (groupIndex === -1) {
            grouped.otherChats.push({
              groupId: c.customerSupportId ?? "",
              name: c.customerSupportDisplayName ?? "",
              chats: [c],
            });
          } else {
            grouped.otherChats[groupIndex].chats.push(c);
          }
        }
      });

      grouped.otherChats.sort((a, b) => a.name.localeCompare(b.name));
    }

    return grouped;
  },
  getGroupedPendingChats: () => {
    const pendingChats = get().pendingChats;
    const userInfo = get().userInfo;

    const grouped: GroupedPendingChat = {
      newChats: [],
      inProcessChats: [],
      myChats: [],
      otherChats: [],
    };

    if (!pendingChats) return grouped;

    pendingChats.forEach((c) => {
      if (c.customerSupportId === "chatbot") {
        grouped.newChats.push(c);
      } else {
        grouped.inProcessChats.push(c);
      }
    });

    grouped.inProcessChats.forEach((c) => {
      if (c.customerSupportId === userInfo?.idCode) {
        grouped.myChats.push(c);
        return;
      }

      grouped.myChats.sort((a, b) => a.created.localeCompare(b.created));
      const groupIndex = grouped.otherChats.findIndex((x) => x.groupId === c.customerSupportId);
      if (c.customerSupportId !== "") {
        if (groupIndex === -1) {
          grouped.otherChats.push({
            groupId: c.customerSupportId ?? "",
            name: c.customerSupportDisplayName ?? "",
            chats: [c],
          });
        } else {
          grouped.otherChats[groupIndex].chats.push(c);
        }
      }
      grouped.otherChats.sort((a, b) => a.name.localeCompare(b.name));
    });
    return grouped;
  },
  getValidationChats: () => {
    return get().validationChats;
  },
}));

export default useStore;
