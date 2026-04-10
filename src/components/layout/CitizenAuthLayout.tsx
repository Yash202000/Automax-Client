import React from "react";
import { Outlet } from "react-router-dom";
import { Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

export const CitizenAuthLayout: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — identical to AuthLayout */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[32rem] h-[32rem] bg-white rounded-full translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Automax</span>
          </div>
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                {t("citizen.layoutTitle", "Complete your")}
                <br />
                <span className="text-blue-200">
                  {t("citizen.layoutSubtitle", "incident report")}
                </span>
              </h1>
              <p className="mt-6 text-lg text-blue-100 max-w-md leading-relaxed">
                {t(
                  "citizen.layoutDescription",
                  "You reported an incident via our IVR system. Use this secure page to add your exact location and supporting attachments.",
                )}
              </p>
            </div>
            <div className="space-y-4">
              {[
                t("citizen.feature1", "Pin your exact location on the map"),
                t("citizen.feature2", "Upload photos or documents"),
                t("citizen.feature3", "Add any extra details as a comment"),
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-blue-100">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-blue-200 text-sm">
            &copy; {new Date().getFullYear()} Automax.{" "}
            {t("common.allRightsReserved", "All rights reserved.")}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center p-6 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Automax</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>

        <div className="lg:hidden p-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Automax.{" "}
          {t("common.allRightsReserved", "All rights reserved.")}
        </div>
      </div>
    </div>
  );
};
