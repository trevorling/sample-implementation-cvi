import React, {FC, PropsWithChildren, useEffect, useRef, useState,} from "react";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {AxiosError} from "axios";
import {useIdleTimer} from "react-idle-timer";
import {useNotificationEvent, useNotificationsClient} from "@buerokratt-ria/notifications/react";
import {ToastContextType} from "./context/ToastContext.tsx";
import {MdOutlineExpandMore} from "react-icons/md";

import {Button, Drawer, Icon, Input, Section, Switch, SwitchBox, Track,} from "./components";
import useStore from "./store/store.ts";
// @ts-ignore
import {ReactComponent as BykLogo} from "./assets/logo.svg";
import {ReactComponent as StatusCommentLogo} from "./assets/status-comment.svg";
import {UserProfileSettings} from "./types/userProfileSettings";
import {
    isHiddenFeaturesEnabled,
    isValidationsEnabled,
    SESSION_EXTEND_DELAY_AFTER_LOAD,
    SESSION_EXTEND_INTERVAL,
    STATUS_COMMENT_LENGTH,
    USER_IDLE_STATUS_TIMEOUT
} from "./constants/config";
import apiDev from "./services/api-dev";
import {AUTHORITY} from "./types/authorities";
import "./Header.scss";
import {UserInfo} from "./types/userInfo.ts";
import useChatNotifyEffect from "./hooks/useChatNotifyEffect.tsx";
import {AiOutlineClose} from "react-icons/ai";
import DomainSelectorBar from "./components/DomainSelectorBar";

type CustomerSupportActivity = {
    idCode: string;
    active: true;
    status: string;
    statusComment: string;
};

type CustomerSupportActivityDTO = {
    customerSupportActive: boolean;
    customerSupportStatus: "offline" | "idle" | "online";
    customerSupportId: string;
    statusComment: string;
    changingStatusComment?: boolean;
};

const statusColors: Record<string, string> = {
    idle: "#FFB511",
    online: "#308653",
    offline: "#D73E3E",
};

type UserStoreStateProps = {
    user: UserInfo | null;
    setUserDomains: (domains: string[]) => void;
    toastContext: ToastContextType | null;
    isDomainSelectorVisible: boolean;
};

const Header: FC<PropsWithChildren<UserStoreStateProps>> = ({user, toastContext, setUserDomains, isDomainSelectorVisible}) => {
    const {t} = useTranslation();
    const userInfo = user;
    const toast = toastContext;

    const queryClient = useQueryClient();
    const [userDrawerOpen, setUserDrawerOpen] = useState(false);
    const [statusCommentOpen, setStatusCommentOpen] = useState(false);
    const csaStatus = useStore((state) => state.csaStatus);
    const statusComment = useStore((state) => state.csaStatusComment);
    const [editingStatusComment, setEditingStatusComment] = useState(statusComment);
    const chatCsaActive = useStore((state) => state.chatCsaActive);
    const userProfileSettings = useStore((state) => state.userProfileSettings);

    useEffect(() => {
        if (userInfo) {
            useStore.getState().setUserInfo(userInfo ?? null);
        }
    }, [userInfo]);

    useChatNotifyEffect({toast, useStore});

    useEffect(() => {
      if(import.meta.env.REACT_APP_LOCAL !== 'true') {
        const interval = setInterval(() => {
          const expirationTimeStamp = localStorage.getItem("exp");
          if (
              expirationTimeStamp !== "null" &&
              expirationTimeStamp !== null &&
              expirationTimeStamp !== undefined
          ) {
            const expirationDate = new Date(parseInt(expirationTimeStamp) ?? "");
            const currentDate = new Date(Date.now());
            if (expirationDate < currentDate) {
              sessionLogoutMutation.mutate();
            }
          } else {
            sessionLogoutMutation.mutate();
          }
        }, 10000);
        return () => clearInterval(interval);
      }
    }, []);

    useEffect(() => {
        getMessages();
    }, [userInfo?.idCode]);

    const getMessages = async () => {
        const {data: res} = await apiDev.get("accounts/settings");

        if (res.response && res.response != "error: not found")
            useStore.getState().setUserProfileSettings(res.response[0]);
    };
    const {data: customerSupportActivity, refetch: getCsaActiveStatus} = useQuery<CustomerSupportActivity>({
        queryKey: ["accounts/customer-support-activity", "prod"],
        onSuccess(res: any) {
            const activity = res.response;
            useStore.getState().setCsaStatus(activity.status);
            useStore.getState().setChatCsaActive(activity.active);
            useStore.getState().setCsaStatusComment(activity.statusComment);
            setEditingStatusComment(activity.statusComment);
        },
        onError: (_) => {
            useStore.getState().setCsaStatusComment("");
            useStore.getState().setCsaStatus('offline');
            useStore.getState().setChatCsaActive(false);
        }
    });

    const [awayStatusActive, setAwayStatusActive] = useState(true);
    const [awayStatusTimeout, setAwayStatusTimeout] = useState(USER_IDLE_STATUS_TIMEOUT);

    useQuery({
      queryKey: ["accounts/admin/session-length", "prod"],
      refetchOnWindowFocus: false,
      onSuccess: (res: any) => {
        const config = (res.response ?? []).reduce(
          (acc: Record<string, string>, item: { key: string; value: string }) => {
            acc[item.key] = item.value;
            return acc;
          },
          {},
        );

        if (config.away_status_active !== undefined) {
          setAwayStatusActive(config.away_status_active?.toLowerCase() === "true");
        }
        if (config.away_status_timeout) {
          setAwayStatusTimeout(parseInt(config.away_status_timeout, 10) * 60000);
        }
      },
    });

    useNotificationEvent('chat_status_changed', async () => {
        const store = useStore.getState();
        const reloads = [store.loadActiveChats(), store.loadPendingChats()];

        if (isValidationsEnabled) reloads.push(store.loadValidationChats());
        await Promise.allSettled(reloads);
    });

    const unansweredChatsLength = useStore((state) => state.unansweredChatsLength());
    const forwardedChatsLength = useStore((state) => state.forwordedChatsLength());
    const pendingChatsLength = useStore((state) => state.pendingChatsLength());

    const userProfileSettingsMutation = useMutation({
        mutationFn: async (data: UserProfileSettings) => {
            await apiDev.post("accounts/settings", {
                forwardedChatPopupNotifications: data.forwardedChatPopupNotifications,
                forwardedChatSoundNotifications: data.forwardedChatSoundNotifications,
                forwardedChatEmailNotifications: data.newChatEmailNotifications,
                newChatPopupNotifications: data.newChatPopupNotifications,
                newChatSoundNotifications: data.newChatSoundNotifications,
                newChatEmailNotifications: data.newChatEmailNotifications,
                useAutocorrect: data.useAutocorrect,
            });
            useStore.getState().setUserProfileSettings(data);
        },
        onError: async (error: AxiosError) => {
            await queryClient.invalidateQueries(["accounts/settings"]);
            toast?.open({
                type: "error",
                title: t("global.notificationError"),
                message: t("global.notificationErrorMsg"),
            });
            console.error(error.message);
        },
    });

    const unClaimAllAssignedChats = useMutation({
        mutationFn: (_) => apiDev.get("chats/assigned/unclaim"),
    });

    const customerSupportActivityMutation = useMutation({
        mutationFn: (data: CustomerSupportActivityDTO) =>
            apiDev.post("accounts/customer-support-activity", {
                customerSupportActive: data.customerSupportActive,
                customerSupportStatus: data.customerSupportStatus,
                statusComment: data.statusComment
            }),
        onSuccess: (data, variables) => {
            useStore.getState().setCsaStatus(variables.customerSupportStatus);
            useStore.getState().setChatCsaActive(variables.customerSupportActive);

            if (variables.changingStatusComment) {
                toast?.open({
                    type: "success",
                    title: t("global.notification"),
                    message: t("settings.users.statusCommentUpdated"),
                });
                useStore.getState().setCsaStatusComment(variables.statusComment);
                setStatusCommentOpen(false);
            } else {
                setEditingStatusComment('');
                useStore.getState().setCsaStatusComment('');
            }
        },
        onError: async (error: AxiosError) => {
            await queryClient.invalidateQueries([
                "accounts/customer-support-activity",
                "prod",
            ]);
            toast?.open({
                type: "error",
                title: t("global.notificationError"),
                message: t("global.notificationErrorMsg"),
            });
            console.error(error.message);
        },
    });

    const { reconnect } = useNotificationsClient();
    const extendUserSessionMutation = useMutation({
        mutationFn: () => apiDev.post("extend", {}),
        onSuccess: () => {
            reconnect()

            const sessionLength = Number(userInfo?.JWTExpirationTimestamp) - Number(userInfo?.JWTCreated);
            if (sessionLength > 0) localStorage.setItem("exp", String(Date.now() + sessionLength));
        },
    });

    const logoutMutation = useMutation({
        mutationFn: () => {
            return apiDev.get("accounts/logout")
        },
        onSuccess(_: any) {
            localStorage.removeItem("exp");
            window.location.href = import.meta.env.REACT_APP_CUSTOMER_SERVICE_LOGIN;
        },
        onError: async (error: AxiosError) => {
            toast?.open({
                type: "error",
                title: t("global.notificationError"),
                message: t("global.notificationErrorMsg"),
            });
            console.error(error.message);
        },
    });

    const sessionLogoutMutation = useMutation({
      mutationFn: () => {
        return apiDev.post("session/logout", { "userId": userInfo?.idCode });
      },
      onSettled() {
        localStorage.removeItem("exp");
        window.location.href = import.meta.env.REACT_APP_CUSTOMER_SERVICE_LOGIN;
      },
    });

    const onIdle = () => {
        if (!customerSupportActivity) return;
        if (csaStatus === "offline") return;

        if (csaStatus === "online") {
            customerSupportActivityMutation.mutate({
                customerSupportActive: true,
                customerSupportId: customerSupportActivity.idCode,
                customerSupportStatus: "idle",
                statusComment: ""
            });
        }
    };

    const onAction = () => {
        if (!customerSupportActivity) return;
        if (csaStatus === "idle") {
            customerSupportActivityMutation.mutate({
                customerSupportActive: chatCsaActive,
                customerSupportId: customerSupportActivity.idCode,
                customerSupportStatus: "online",
                statusComment: ""
            });
        }
    }

    useIdleTimer({
        onIdle,
        onAction,
        timeout: awayStatusTimeout,
        throttle: 500,
        disabled: !awayStatusActive,
    });

    const mountedAt = useRef(Date.now());

    useIdleTimer({
        onAction: () => {
            if (Date.now() - mountedAt.current < SESSION_EXTEND_DELAY_AFTER_LOAD) return;
            extendUserSessionMutation.mutate();
        },
        throttle: SESSION_EXTEND_INTERVAL,
    });

    const handleUserProfileSettingsChange = (key: string, checked: boolean) => {
        if (!userProfileSettings) return;
        const newSettings = {
            ...userProfileSettings,
            [key]: checked,
        };
        userProfileSettingsMutation.mutate(newSettings);
    };

    const handleCsaStatusChange = (checked: boolean) => {
        if (checked === false) unClaimAllAssignedChats.mutate();

        customerSupportActivityMutation.mutate({
            customerSupportActive: checked,
            customerSupportStatus: checked ? "online" : "offline",
            customerSupportId: "",
            statusComment: ""
        });

        setStatusCommentOpen(!checked);
    };

    const cancelStatusComment = () => {
        setEditingStatusComment(statusComment);
        useStore.getState().setCsaStatusComment(statusComment);
        setStatusCommentOpen(false);
    };

    return (
        <>
            <header className="header">
                <div className="header__top">
                <Track justify="between">
                    <BykLogo height={50}/>
                    {userInfo && (
                        <Track gap={32}>
                            <Track gap={16}>
                                <p
                                    style={{
                                        color: "#5D6071",
                                        fontSize: 14,
                                        textTransform: "lowercase",
                                    }}
                                >
                                    <strong>{unansweredChatsLength}</strong>{" "}
                                    {t("chat.unanswered")} <strong>{forwardedChatsLength}</strong>{" "}
                                    {t("chat.forwarded")} <strong>{pendingChatsLength}</strong>{" "}
                                    {t("chat.pending")}{" "}
                                </p>
                                <div>
                                    <Switch
                                        onCheckedChange={handleCsaStatusChange}
                                        checked={chatCsaActive}
                                        label={t("global.csaStatus")}
                                        hideLabel
                                        name="csaStatus"
                                        onColor="#308653"
                                        onLabel={t("global.present") || ""}
                                        offLabel={t("global.busy") || ""}
                                    />
                                </div>
                                <Track direction="vertical">
                                    {!chatCsaActive && (
                                        <Button
                                            style={{
                                                boxShadow: "none",
                                            }}
                                            appearance="text"
                                            onClick={() => {
                                                setStatusCommentOpen(!statusCommentOpen);
                                            }}
                                        >
                                            <StatusCommentLogo height={20} width={18}/>
                                        </Button>
                                    )}
                                    {!chatCsaActive && statusCommentOpen && (
                                        <div
                                            style={{
                                                background: "#FFF",
                                                borderRadius: "4px",
                                                boxShadow: "0px 20px 40px rgba(0, 0, 0, 0.25)",
                                                padding: "5px 15px 30px",
                                                position: "fixed",
                                                top: `${isDomainSelectorVisible ? 150 : 100}px`,
                                                right: 0,
                                                width: "600px"
                                            }}
                                        >
                                            <Icon
                                                style={{
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    margin: "0 0 15px auto"
                                                }}
                                                icon={
                                                    <AiOutlineClose
                                                        fontSize={18}
                                                        color="#000"
                                                        onClick={cancelStatusComment}
                                                    />
                                                }
                                                size="medium"
                                            />
                                            <Input
                                                label={t("global.statusClarification")}
                                                maxLength={STATUS_COMMENT_LENGTH}
                                                value={editingStatusComment}
                                                onChange={(e) => {
                                                    setEditingStatusComment(e.target.value);
                                                }}
                                            />
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: "10px",
                                                    justifyContent: "flex-end",
                                                    marginTop: "15px",
                                                }}
                                            >
                                                <Button
                                                    appearance="secondary"
                                                    onClick={cancelStatusComment}
                                                >
                                                    {t("global.cancel")}
                                                </Button>
                                                <Button
                                                    appearance="primary"
                                                    onClick={() => {
                                                        customerSupportActivityMutation.mutate({
                                                            customerSupportActive: false,
                                                            customerSupportStatus: "offline",
                                                            customerSupportId: userInfo.idCode,
                                                            statusComment: editingStatusComment,
                                                            changingStatusComment: true,
                                                        });
                                                    }}
                                                >
                                                    {t("global.save")}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </Track>
                            </Track>
                            <span
                                style={{
                                    display: "block",
                                    width: 2,
                                    height: 30,
                                    backgroundColor: "#DBDFE2",
                                }}
                            ></span>
                            <Button
                                appearance="text"
                                onClick={() => setUserDrawerOpen(!userDrawerOpen)}
                            >
                <span
                    style={{
                        display: "block",
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        backgroundColor: statusColors[csaStatus],
                        marginRight: 8,
                    }}
                ></span>
                                {userInfo.displayName}
                                <Icon icon={<MdOutlineExpandMore/>}/>
                            </Button>
                            <Button
                                appearance="text"
                                style={{textDecoration: "underline"}}
                                onClick={() => {
                                    customerSupportActivityMutation.mutate({
                                        customerSupportActive: false,
                                        customerSupportStatus: "offline",
                                        customerSupportId: userInfo.idCode,
                                        statusComment: "",
                                    });
                                    logoutMutation.mutate();
                                }}
                            >
                                {t("global.logout")}
                            </Button>
                        </Track>
                    )}
                </Track>
                </div>
                {isDomainSelectorVisible && userInfo && (
                    <DomainSelectorBar
                        user={userInfo}
                        setUserDomains={setUserDomains}
                        toastContext={toast}
                    />
                )}
            </header>

            {userInfo && userProfileSettings && userDrawerOpen && (
                <Drawer
                    title={userInfo.displayName}
                    onClose={() => setUserDrawerOpen(false)}
                    style={{width: 400, top: isDomainSelectorVisible ? 150 : 100}}
                >
                    <Section>
                        <Track gap={8} direction="vertical" align="left">
                            {[
                                {
                                    label: t("settings.users.displayName"),
                                    value: userInfo.displayName,
                                },
                                {
                                    label: t("settings.users.userRoles"),
                                    value: userInfo.authorities
                                        .map((r) => t(`roles.${r}`))
                                        .join(", "),
                                },
                                {
                                    label: t("settings.users.userTitle"),
                                    value: userInfo.csaTitle?.replaceAll(" ", "\xa0"),
                                },
                                {label: t("settings.users.email"), value: userInfo.csaEmail},
                            ].map((meta, index) => (
                                <Track key={`${meta.label}-${index}`} gap={24} align="left">
                                    <p style={{flex: "0 0 120px"}}>{meta.label}:</p>
                                    <p>{meta.value}</p>
                                </Track>
                            ))}
                        </Track>
                    </Section>
                    {[
                        AUTHORITY.ADMINISTRATOR,
                        AUTHORITY.CUSTOMER_SUPPORT_AGENT,
                        AUTHORITY.SERVICE_MANAGER,
                    ].some((auth) => userInfo.authorities.includes(auth)) && (
                        <>
                            {isHiddenFeaturesEnabled && (
                                <Section>
                                    <Track gap={8} direction="vertical" align="left">
                                        <p className="h6">{t("settings.users.autoCorrector")}</p>
                                        <SwitchBox
                                            name="useAutocorrect"
                                            label={t("settings.users.useAutocorrect")}
                                            checked={userProfileSettings.useAutocorrect}
                                            onCheckedChange={(checked) =>
                                                handleUserProfileSettingsChange(
                                                    "useAutocorrect",
                                                    checked
                                                )
                                            }
                                        />
                                    </Track>
                                </Section>
                            )}
                            {isHiddenFeaturesEnabled && (
                                <Section>
                                    <Track gap={8} direction="vertical" align="left">
                                        <p className="h6">
                                            {t("settings.users.emailNotifications")}
                                        </p>
                                        <SwitchBox
                                            name="forwardedChatEmailNotifications"
                                            label={t("settings.users.newForwardedChat")}
                                            checked={
                                                userProfileSettings.forwardedChatEmailNotifications
                                            }
                                            onCheckedChange={(checked) =>
                                                handleUserProfileSettingsChange(
                                                    "forwardedChatEmailNotifications",
                                                    checked
                                                )
                                            }
                                        />
                                        <SwitchBox
                                            name="newChatEmailNotifications"
                                            label={t("settings.users.newUnansweredChat")}
                                            checked={userProfileSettings.newChatEmailNotifications}
                                            onCheckedChange={(checked) =>
                                                handleUserProfileSettingsChange(
                                                    "newChatEmailNotifications",
                                                    checked
                                                )
                                            }
                                        />
                                    </Track>
                                </Section>
                            )}
                            <Section>
                                <Track gap={8} direction="vertical" align="left">
                                    <p className="h6">{t("settings.users.soundNotifications")}</p>
                                    <SwitchBox
                                        name="forwardedChatSoundNotifications"
                                        label={t("settings.users.newForwardedChat")}
                                        checked={
                                            userProfileSettings.forwardedChatSoundNotifications
                                        }
                                        onCheckedChange={(checked) =>
                                            handleUserProfileSettingsChange(
                                                "forwardedChatSoundNotifications",
                                                checked
                                            )
                                        }
                                    />
                                    <SwitchBox
                                        name="newChatSoundNotifications"
                                        label={t("settings.users.newUnansweredChat")}
                                        checked={userProfileSettings.newChatSoundNotifications}
                                        onCheckedChange={(checked) =>
                                            handleUserProfileSettingsChange(
                                                "newChatSoundNotifications",
                                                checked
                                            )
                                        }
                                    />
                                </Track>
                            </Section>
                            <Section>
                                <Track gap={8} direction="vertical" align="left">
                                    <p className="h6">{t("settings.users.popupNotifications")}</p>
                                    <SwitchBox
                                        name="forwardedChatPopupNotifications"
                                        label={t("settings.users.newForwardedChat")}
                                        checked={
                                            userProfileSettings.forwardedChatPopupNotifications
                                        }
                                        onCheckedChange={(checked) =>
                                            handleUserProfileSettingsChange(
                                                "forwardedChatPopupNotifications",
                                                checked
                                            )
                                        }
                                    />
                                    <SwitchBox
                                        name="newChatPopupNotifications"
                                        label={t("settings.users.newUnansweredChat")}
                                        checked={userProfileSettings.newChatPopupNotifications}
                                        onCheckedChange={(checked) =>
                                            handleUserProfileSettingsChange(
                                                "newChatPopupNotifications",
                                                checked
                                            )
                                        }
                                    />
                                </Track>
                            </Section>
                        </>
                    )}
                </Drawer>
            )}
        </>
    );
};

export default Header;
