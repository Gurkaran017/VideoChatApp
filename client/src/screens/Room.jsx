"use client"

import { useEffect, useCallback, useState } from "react"
import ReactPlayer from "react-player"
import peer from "../service/peer"
import { useSocket } from "../context/SocketProvider"

const RoomPage = () => {
  const { socket, myname } = useSocket()
  const [remoteSocketId, setRemoteSocketId] = useState(null)                        // other user's socket ID
  const [myStream, setMyStream] = useState()
  const [remoteStream, setRemoteStream] = useState()
  const [remoteName, setRemoteName] = useState("")

  const handleUserJoined = useCallback(({ email, id, name }) => {                   // 1 step when coming from lobby 
    console.log(`Email ${email} joined room with name ${name} and id ${id}`)
    console.log("name in room.jsx", myname)
    setRemoteSocketId(id)
    setRemoteName(name)
  }, [])

  const handleCallUser = useCallback(async () => {                                  // 2 step by clicking CALL button by gurkaran
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    })
    const offer = await peer.getOffer()
    socket.emit("user:call", { to: remoteSocketId, offer, myname })
    setMyStream(stream)
  }, [remoteSocketId, socket])

  const handleEndCall = useCallback(() => {                                         // END CALL 
  // Stop local media tracks
  if (myStream) {
    myStream.getTracks().forEach((track) => track.stop());
  }

  // Stop remote media tracks (if any)
  if (remoteStream) {
    remoteStream.getTracks().forEach((track) => track.stop());
  }

  // Close peer connection
  peer.peer.close();

  // Clear state
  setMyStream(null);
  setRemoteStream(null);
  setRemoteSocketId(null);
  setRemoteName("");
}, [myStream, remoteStream]);


  const handleIncommingCall = useCallback(                                         // 3 step on kushal side 
    async ({ from, offer, myname }) => {
      setRemoteSocketId(from)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      })
      setMyStream(stream)
      setRemoteName(myname)
      console.log(`Incoming Call`, from, offer)
      const ans = await peer.getAnswer(offer)
      socket.emit("call:accepted", { to: from, ans })
    },
    [socket],
  )

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream)
    }
  }, [myStream])

  const handleCallAccepted = useCallback(                                        // 4 step on gurkaran side
    ({ from, ans }) => {
      peer.setLocalDescription(ans)
      console.log("Call Accepted!")
      sendStreams()
    },
    [sendStreams],
  )

  const handleNegoNeeded = useCallback(async () => {                            // step 6 first appears when gurkaran clicks CALL button
    const offer = await peer.getOffer()
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId })
  }, [remoteSocketId, socket])

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded)
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded)
    }
  }, [handleNegoNeeded])

  const handleNegoNeedIncomming = useCallback(                                   // step 7 first appears when kushal receives a call
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer)
      socket.emit("peer:nego:done", { to: from, ans })
    },
    [socket],
  )

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {                   // step 8 
    await peer.setLocalDescription(ans)
  }, [])

  useEffect(() => {                                                              // step 5
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams
      console.log("GOT TRACKS!!")
      setRemoteStream(remoteStream[0])
    })
  }, [])

  useEffect(() => {
    socket.on("user:joined", handleUserJoined)
    socket.on("incomming:call", handleIncommingCall)
    socket.on("call:accepted", handleCallAccepted)
    socket.on("peer:nego:needed", handleNegoNeedIncomming)
    socket.on("peer:nego:final", handleNegoNeedFinal)

    return () => {
      socket.off("user:joined", handleUserJoined)
      socket.off("incomming:call", handleIncommingCall)
      socket.off("call:accepted", handleCallAccepted)
      socket.off("peer:nego:needed", handleNegoNeedIncomming)
      socket.off("peer:nego:final", handleNegoNeedFinal)
    }
  }, [socket, handleUserJoined, handleIncommingCall, handleCallAccepted, handleNegoNeedIncomming, handleNegoNeedFinal])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl shadow-blue-500/25 transform hover:scale-105 transition-transform duration-300">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
              />
            </svg>
          </div>
              <div>
                <p className="text-gray-600 text-lg">Connect and communicate seamlessly</p>
              </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3 bg-gray-50 rounded-full px-6 py-3">
                  <div
                    className={`w-4 h-4 rounded-full ${remoteSocketId ? "bg-emerald-500 animate-pulse" : "bg-red-400"} shadow-lg`}
                  ></div>
                  <span className={`font-semibold text-lg ${remoteSocketId ? "text-emerald-700" : "text-red-600"}`}>
                    {remoteSocketId ? "Connected" : "Waiting..."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Controls</h2>
            <div className="flex flex-wrap gap-4">
              {myStream && (
                <button
                  onClick={sendStreams}
                  className="group relative bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0"
                >
                  <span className="relative z-10">Send Stream</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                </button>
              )}
              {remoteSocketId && (
                <button
                  onClick={handleCallUser}
                  className="group relative bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0"
                >
                  <span className="relative z-10">CALL</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                </button>
              )}
              {(myStream || remoteStream) && (
  <button
    onClick={handleEndCall}
    className="group relative bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0"
  >
    <span className="relative z-10">End Call</span>
    <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
  </button>
)}

            </div>
          </div>
        </div>

        {/* Video Streams Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* My Stream */}
          {myStream && (
            <div className="group">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                    <h2 className="text-xl font-bold text-white">My Stream</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-inner">
                    <ReactPlayer playing muted height="300px" width="100%" url={myStream} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Remote Stream */}
          {remoteStream && (
            <div className="group">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                    <h2 className="text-xl font-bold text-white">{remoteName || "Remote User"}</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-inner">
                    <ReactPlayer playing muted height="300px" width="100%" url={remoteStream} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {!myStream && !remoteStream && (
          <div className="mt-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <svg className="w-16 h-16 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-4">Ready to Connect</h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  {remoteSocketId
                    ? "Everything is set up! Click the CALL button to start your video conversation."
                    : "Waiting for someone to join the room. Share the room link to get started."}
                </p>
                {!remoteSocketId && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-3 h-3 bg-pink-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RoomPage
