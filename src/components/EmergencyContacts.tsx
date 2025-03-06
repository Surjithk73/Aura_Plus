import React from 'react';
import { X, Phone } from 'lucide-react';

interface EmergencyContactsProps {
  onClose: () => void;
}

const EmergencyContacts: React.FC<EmergencyContactsProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Phone className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Emergency Contacts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Important Note */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-300 text-sm">
              If you or someone you know is in immediate danger, please call your local emergency services immediately.
            </p>
          </div>

          {/* Contact List */}
          <div className="space-y-3">
            {/* National Suicide Prevention Lifeline */}
            <a
              href="tel:988"
              className="block bg-gray-700/50 hover:bg-gray-700 rounded-lg p-4 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-white font-medium">988 Suicide & Crisis Lifeline</h3>
                  <p className="text-gray-400 text-sm">24/7 Support - Call 988</p>
                </div>
                <Phone className="w-5 h-5 text-blue-400" />
              </div>
            </a>

            {/* Crisis Text Line */}
            <div className="bg-gray-700/50 hover:bg-gray-700 rounded-lg p-4 transition-colors">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-white font-medium">Crisis Text Line</h3>
                  <p className="text-gray-400 text-sm">Text HOME to 741741</p>
                </div>
                <Phone className="w-5 h-5 text-blue-400" />
              </div>
            </div>

            {/* Emergency Services */}
            <a
              href="tel:911"
              className="block bg-gray-700/50 hover:bg-gray-700 rounded-lg p-4 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-white font-medium">Emergency Services</h3>
                  <p className="text-gray-400 text-sm">Call 911</p>
                </div>
                <Phone className="w-5 h-5 text-blue-400" />
              </div>
            </a>

            {/* SAMHSA's National Helpline */}
            <a
              href="tel:18006624357"
              className="block bg-gray-700/50 hover:bg-gray-700 rounded-lg p-4 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-white font-medium">SAMHSA's National Helpline</h3>
                  <p className="text-gray-400 text-sm">1-800-662-4357</p>
                </div>
                <Phone className="w-5 h-5 text-blue-400" />
              </div>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyContacts; 