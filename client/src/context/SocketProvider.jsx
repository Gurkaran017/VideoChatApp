import React, { createContext, useMemo, useContext, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  const socket = useContext(SocketContext);
  return socket;
};

export const SocketProvider = (props) => {
  const socket = useMemo(() => io("localhost:8000"), []);
  const [myname, setMyName] = useState("");

  return (
    <SocketContext.Provider value={{socket, myname, setMyName}}>
      {props.children}
    </SocketContext.Provider>
  );
};
