import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust path if your firebase.js is somewhere else

export default function NotificationBell({ recipientId }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!recipientId) return;
    
    // Fetch notifications meant specifically for this recipient
    const q = query(collection(db, "notifications"), where("recipientId", "==", recipientId));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side to avoid needing a complex Firebase Composite Index right before your deadline!
      fetched.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setNotifications(fetched);
    });

    return () => unsub();
  }, [recipientId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h4 className="font-bold text-slate-900">Notifications</h4>
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">{unreadCount} New</span>
          </div>
          
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">You're all caught up!</p>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  onClick={() => markAsRead(notif.id)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${!notif.read ? 'bg-blue-50/50' : 'opacity-70'}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className={`text-sm ${!notif.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {notif.title}
                    </p>
                    {!notif.read && <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{notif.message}</p>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">
                    {notif.createdAt ? notif.createdAt.toDate().toLocaleString() : 'Just now'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}