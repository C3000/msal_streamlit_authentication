import React, { useCallback, useEffect, useState, useRef } from "react"
import {
    withStreamlitConnection,
    Streamlit,
    ComponentProps,
} from "streamlit-component-lib"
import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

const Authentication = ({ args }: ComponentProps) => {
    const msalInstanceRef = useRef(null);
    const [msalInitialized, setMsalInitialized] = useState(false);

    useEffect(() => {
        if (!msalInstanceRef.current) {
            const msalInstance = new PublicClientApplication({
                auth: args["auth"],
                cache: args["cache"],
                system: {
                    loggerOptions: {
                        loggerCallback: (level: any, message: any, containsPii: any) => {
                            if (containsPii) return;
                            switch (level) {
                                case LogLevel.Error:
                                    console.error(message);
                                    break;
                                case LogLevel.Warning:
                                    console.warn(message);
                                    break;
                                case LogLevel.Verbose:
                                    console.debug(message);
                                    break;
                            }
                        }
                    }
                }
            });

            msalInstanceRef.current = msalInstance;

            msalInstance.initialize()
                .then(() => {
                    setMsalInitialized(true);
                    console.log("MSAL erfolgreich initialisiert");
                })
                .catch(console.error);
        }
    }, []);

    const loginRequest = args["login_request"] ?? undefined;
    const logoutRequest = args["logout_request"] ?? undefined;
    const loginButtonText = args["login_button_text"] ?? "";
    const logoutButtonText = args["logout_button_text"] ?? "";
    const buttonClass = args["class_name"] ?? "";
    const buttonId = args["html_id"] ?? "";

    const [loginToken, setLoginToken] = useState(null);

    const getMsalInstance = () => msalInstanceRef.current;

    const isAuthenticated = useCallback(() => {
        const msalInstance = getMsalInstance();
        return msalInstance && msalInitialized &&
               msalInstance.getAllAccounts &&
               msalInstance.getAllAccounts().length > 0;
    }, [msalInitialized]);

    useEffect(() => {
        if (!msalInitialized) return;

        const msalInstance = getMsalInstance();
        if (!msalInstance) return;

        if (msalInstance.getAllAccounts().length > 0) {
            msalInstance.acquireTokenSilent({
                ...loginRequest,
                account: msalInstance.getAllAccounts()[0]
            }).then(function (response: any) {
                setLoginToken(response);
            }).catch(console.error);
        } else {
            setLoginToken(null);
        }
    }, [msalInitialized]);

    useEffect(() => {
        Streamlit.setComponentValue(loginToken);
        Streamlit.setFrameHeight();
        Streamlit.setComponentReady();
    }, [loginToken]);

    const loginPopup = useCallback(() => {
        const msalInstance = getMsalInstance();
        if (!msalInstance || !msalInitialized) return;

        msalInstance.loginPopup(loginRequest).then(function (response: any) {
            setLoginToken(response);
        }).catch(console.error);
    }, [msalInitialized, loginRequest]);

    const logoutPopup = useCallback(() => {
        const msalInstance = getMsalInstance();
        if (!msalInstance || !msalInitialized) return;

        // @ts-ignore
        msalInstance.logoutPopup(logoutRequest).then(function () {
            setLoginToken(null);
        }).catch(console.error);
    }, [msalInitialized, logoutRequest]);

    if (!msalInitialized) {
        return <div className="card">Initialisiere ...</div>;
    }

    return (
        <div className="card">
            <button onClick={isAuthenticated() ? logoutPopup : loginPopup} className={buttonClass} id={buttonId}>
                {isAuthenticated() ? logoutButtonText : loginButtonText}
            </button>
        </div>
    );

}

export default withStreamlitConnection(Authentication);
