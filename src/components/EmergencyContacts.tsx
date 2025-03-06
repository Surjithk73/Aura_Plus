import React from 'react';
import { X, Phone, Heart, Shield, AlertCircle } from 'lucide-react';

interface EmergencyContactsProps {
  onClose: () => void;
}

const EmergencyContacts: React.FC<EmergencyContactsProps> = ({ onClose }) => {
  const emergencyNumbers = [
    {
      name: "National Suicide Prevention Lifeline",
      number: "988",
      available: "24/7",
      icon: Heart,
      color: "text-red-500",
      bgColor: "bg-red-500"
    },
    {
      name: "Crisis Text Line",
      number: "Text HOME to 741741",
      available: "24/7",
      icon: AlertCircle,
      color: "text-blue-500",
      bgColor: "bg-blue-500"
    },
    {
      name: "Emergency Services",
      number: "911",
      available: "24/7",
      icon: Phone,
      color: "text-green-500",
      bgColor: "bg-green-500"
    },
    {
      name: "SAMHSA's National Helpline",
      number: "1-800-662-4357",
      available: "24/7",
      icon: Shield,
      color: "text-purple-500",
      bgColor: "bg-purple-500"
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800/95 rounded-2xl w-full max-w-2xl mx-4 overflow-hidden border border-gray-700/50 shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-700/50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">Emergency Contacts</h2>
            <p className="text-gray-400 text-sm mt-1">Immediate help is available 24/7</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {emergencyNumbers.map((contact, index) => (
              <div
                key={index}
                className="bg-gray-700/30 rounded-xl p-4 hover:bg-gray-700/50 transition-colors group"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg ${contact.bgColor}/20 flex items-center justify-center`}>
                    <contact.icon className={`w-6 h-6 ${contact.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{contact.name}</h3>
                    <p className="text-gray-400 text-sm">Available {contact.available}</p>
                  </div>
                  <a
                    href={contact.number.includes('Text') ? undefined : `tel:${contact.number.replace(/\D/g, '')}`}
                    className={`px-4 py-2 ${contact.bgColor}/20 hover:${contact.bgColor}/30 ${contact.color} rounded-lg transition-colors flex items-center space-x-2`}
                  >
                    <Phone className="w-4 h-4" />
                    <span>{contact.number}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Resources */}
          <div className="mt-6 p-4 bg-blue-500/10 rounded-xl">
            <h3 className="text-blue-400 font-medium mb-2">Important Note</h3>
            <p className="text-gray-300 text-sm">
              If you're experiencing a medical emergency, having thoughts of suicide, or are in immediate danger, please call 911 or your local emergency services immediately.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700/50 bg-gray-800/50">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyContacts; 