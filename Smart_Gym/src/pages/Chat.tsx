import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Search } from "lucide-react";

interface Contact {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
}

interface Message {
  id: number;
  sender: "user" | "contact";
  text: string;
  time: string;
}

const Chat = () => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageInput, setMessageInput] = useState("");

  const contacts: Contact[] = [
    { id: 1, name: "Sarah Johnson", lastMessage: "See you at the gym!", time: "10:30 AM", unread: 2 },
    { id: 2, name: "Mike Chen", lastMessage: "Great progress today", time: "9:15 AM", unread: 0 },
    { id: 3, name: "Emily Rodriguez", lastMessage: "Thanks for the tips!", time: "Yesterday", unread: 1 },
    { id: 4, name: "David Thompson", lastMessage: "Ready for tomorrow?", time: "Yesterday", unread: 0 },
  ];

  const messages: Message[] = [
    { id: 1, sender: "contact", text: "Hey! How's your workout going?", time: "10:25 AM" },
    { id: 2, sender: "user", text: "Going great! Just finished my sets.", time: "10:28 AM" },
    { id: 3, sender: "contact", text: "Awesome! See you at the gym!", time: "10:30 AM" },
  ];

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // Handle message sending logic here
      setMessageInput("");
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">Messages</h1>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 h-[600px]">
          {/* Contacts List */}
          <Card className="lg:col-span-4 p-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="pl-10" />
              </div>
            </div>

            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedContact?.id === contact.id
                        ? "bg-primary/10"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-medium">{contact.name}</h4>
                      <span className="text-xs text-muted-foreground">{contact.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {contact.lastMessage}
                      </p>
                      {contact.unread > 0 && (
                        <span className="ml-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {contact.unread}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Chat Window */}
          <Card className="lg:col-span-8 flex flex-col">
            {selectedContact ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border">
                  <h3 className="font-heading font-bold text-lg">{selectedContact.name}</h3>
                  <p className="text-sm text-muted-foreground">Active now</p>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.sender === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <span className="text-xs opacity-70 mt-1 block">
                            {message.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p>Select a conversation to start chatting</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Chat;
