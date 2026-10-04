"use client";

import { DONGGOI_TITLE, DONGGOI_DESCRIPTION } from "@/constants";
import { useAuth } from "@/app/context/AuthContext";
import { fetchSubBarcodeInfo, fetchOrder, fetchSubBarcodes, scanUnitPrint, scanUnitCut, scanUnitQC, scanUnitPackage } from "@/app/lib/barcodeService";
import { login } from "@/app/lib/auth";
import { AUTH_CREDENTIALS } from "@/constants";
import { useRef, useEffect, useState } from "react";
import ImageViewer from "@/app/components/ImageViewer";

export default function DonggoiPage() {
  const { isAuthenticated, isLoading, token } = useAuth();
  const inputRef = useRef(null);
  const [barcode, setBarcode] = useState("");
  const [scannedList, setScannedList] = useState([]);
  const [displayUnits, setDisplayUnits] = useState([]);
  const [originalBarcode, setOriginalBarcode] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [scanResultTimeout, setScanResultTimeout] = useState(null);
  const [loading, setLoading] = useState(false);
  const [vendorCount, setVendorCount] = useState(0);

  // Focus input khi mount và luôn giữ focus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll to selected card when changed
  useEffect(() => {
    if (originalBarcode && displayUnits.length > 0) {
      const selectedCard = document.querySelector(`[data-card-code="${originalBarcode}"]`);
      if (selectedCard) {
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [originalBarcode, displayUnits.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcut = (e) => {
      // Ctrl+Alt+2 = QC Pass
      if (e.ctrlKey && e.altKey && e.key === "2") {
        e.preventDefault();
        handleScanQC();
      }

      // Ctrl+Alt+3 = Pass All
      if (e.ctrlKey && e.altKey && e.key === "3") {
        e.preventDefault();
        handlePassAll();
      }

      // Ctrl+Alt+6 = Package
      if (e.ctrlKey && e.altKey && e.key === "6") {
        e.preventDefault();
        handlePackage();
      }

      // Ctrl+Alt+9 = Package All
      if (e.ctrlKey && e.altKey && e.key === "9") {
        e.preventDefault();
        handlePackageAll();
      }

      // Enter = Close scan result dialog
      if (e.key === "Enter" && scanResult) {
        e.preventDefault();
        setScanResult(null);
        if (scanResultTimeout) clearTimeout(scanResultTimeout);
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [scanResult, scanResultTimeout, displayUnits, originalBarcode]);

  const handleBarcodeChange = (e) => {
    setBarcode(e.target.value);
  };

  // Component để hiển thị units trong grid
  const UnitsGrid = ({ units, scannedBarcode, onSelectUnit, vendorCount }) => {
    if (!units || units.length === 0) return null;

    console.log("🎯 UnitsGrid vendorCount:", vendorCount, "show badge?", vendorCount > 1);

    return (
      <div className="mt-8 flex flex-col">
        <h5 className="text-2xl font-semibold text-white mb-4">
          Tổng:  <span className="text-3xl text-red-400 font-bold">{units.length}</span>
          {vendorCount > 1 && (
            <span className="ml-4 px-3 py-1 rounded-lg text-2xl font-bold" style={{ backgroundColor: "lab(36 72.92 -88.87)" }}>
              Đơn Ghép
            </span>
          )}
        </h5>
        <div className="grid grid-cols-1 gap-0 w-full overflow-y-auto">
          {units.map((unit) => (
            <div
              key={unit.id}
              data-card-code={unit.code}
              onClick={(e) => {
                onSelectUnit(unit.code);
                e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className={`w-full h-[200px] p-0 rounded-lg overflow-hidden border transition cursor-pointer relative ${unit.code === scannedBarcode
                  ? "border-red-500 border-8"
                  : "border-zinc-700 hover:border-zinc-500"
                }`}
              style={{ backgroundColor: "lab(74 0 -0.01)" }}
            >
              {/* Image */}
              {unit.details?.designUrls?.[0] && (
                <img
                  src={unit.details.designUrls[0]}
                  alt={unit.code}
                  className="w-full h-full object-contain block"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              )}

              {/* Status Badge - Absolute top-right */}
              {unit.status && (
                <span className={`absolute top-2 right-2 px-3 py-2 rounded text-base font-semibold text-white ${
                  unit.status === "print" ? "bg-blue-500" :
                  unit.status === "cut" ? "bg-green-500" :
                  unit.status === "qc_pass" ? "bg-purple-500" :
                  unit.status === "package" ? "bg-red-500" :
                  "bg-gray-500"
                }`}>
                  {unit.status}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Refresh all units in order item after scan
  const refreshUnitData = async (unitCode) => {
    try {
      const selectedUnit = displayUnits.find((u) => u.code === unitCode);
      if (!selectedUnit?.orderItemId) {
        console.error("❌ Order item ID not found");
        return null;
      }

      console.log("🔄 Refreshing order item:", selectedUnit.orderItemId);
      const freshData = await fetchSubBarcodes(selectedUnit.orderItemId, token, handleTokenRefresh);

      if (freshData?.units) {
        const updatedUnits = freshData.units.map((unit) => ({
          ...unit,
          workflow: freshData.item?.workflow || [],
          orderItemId: freshData.item?.id,
          details: displayUnits.find((u) => u.code === unit.code)?.details || {},
        }));

        setDisplayUnits(
          displayUnits.map((u) =>
            u.orderItemId === selectedUnit.orderItemId
              ? updatedUnits.find((nu) => nu.code === u.code) || u
              : u
          )
        );

        console.log("✅ Order item refreshed:", selectedUnit.orderItemId);
        return freshData;
      }
    } catch (error) {
      console.error("❌ Refresh failed:", error);
    }
    return null;
  };

  // Token refresh callback
  const handleTokenRefresh = async () => {
    try {
      console.log("🔄 Refreshing token...");
      const result = await login(AUTH_CREDENTIALS.email, AUTH_CREDENTIALS.password);
      if (result.success) {
        console.log("✅ Token refreshed successfully");
        return result.token;
      }
      return null;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return null;
    }
  };

  // Scan package - check QC first, then scan package
  const handlePackage = async () => {
    let selectedUnit = displayUnits.find((u) => u.code === originalBarcode);

    if (!selectedUnit) {
      setScanResult({ success: false, message: "❌ Chọn unit trước" });
      return;
    }

    setLoading(true);
    try {
      // Check current status
      console.log("🔍 Checking status for package scan:", selectedUnit.code);
      const statusData = await fetchSubBarcodeInfo(selectedUnit.code, token, handleTokenRefresh);

      if (!statusData) {
        setScanResult({ success: false, message: "❌ Không lấy được trạng thái" });
        return;
      }

      // Check if QC step is completed
      const qcStepCompleted = statusData.progress?.some((p) => p.baseType === "qc_pass");

      if (!qcStepCompleted) {
        console.log("⏳ QC not done, auto scanning QC first (which checks cut & print)...");
        // Just set originalBarcode to trigger handleScanQC, but we need to call it directly
        // Actually, we need to handle QC ourselves to avoid recursion/circular dependency

        // Check and scan print if needed
        const printStepCompleted = statusData.progress?.some((p) => p.baseType === "print");
        if (!printStepCompleted) {
          const printStep = selectedUnit.workflow?.find((w) => w.baseType === "print");
          if (printStep) {
            const printResult = await scanUnitPrint(selectedUnit.code, printStep.id, token, handleTokenRefresh);
            if (!printResult?.success) {
              setScanResult({ success: false, message: `❌ In thất bại: ${printResult?.error}` });
              return;
            }
            if (printResult.data?.unit) {
              selectedUnit = { ...selectedUnit, progress: printResult.data.unit.progress };
            }
          }
        }

        // Check and scan cut if needed
        const cutStepCompleted = selectedUnit.progress?.some((p) => p.baseType === "cut");
        if (!cutStepCompleted) {
          const cutStep = selectedUnit.workflow?.find((w) => w.baseType === "cut");
          if (cutStep) {
            const cutResult = await scanUnitCut(selectedUnit.code, cutStep.id, token, handleTokenRefresh);
            if (!cutResult?.success) {
              setScanResult({ success: false, message: `❌ Cut thất bại: ${cutResult?.error}` });
              return;
            }
            if (cutResult.data?.unit) {
              selectedUnit = { ...selectedUnit, progress: cutResult.data.unit.progress };
            }
          }
        }

        // Now scan QC
        const qcStep = selectedUnit.workflow?.find((w) => w.baseType === "qc_pass");
        if (qcStep) {
          const qcResult = await scanUnitQC(selectedUnit.code, qcStep.id, token, handleTokenRefresh);
          if (!qcResult?.success) {
            setScanResult({ success: false, message: `❌ QC thất bại: ${qcResult?.error}` });
            return;
          }
          if (qcResult.data?.unit) {
            selectedUnit = { ...selectedUnit, progress: qcResult.data.unit.progress };
          }
        }
        console.log("✅ Auto QC done, scanning package...");
      }

      // Get package step ID
      const packageStep = selectedUnit.workflow?.find((w) => w.baseType === "package");
      if (!packageStep) {
        setScanResult({ success: false, message: "❌ Không có bước Package" });
        return;
      }

      console.log("📦 Scanning package for unit:", selectedUnit.code);
      const packageResult = await scanUnitPackage(selectedUnit.code, packageStep.id, token, handleTokenRefresh);

      if (packageResult?.success) {
        console.log("✅ Scan package success:", selectedUnit.code, packageResult);

        if (packageResult.data?.unit) {
          const updatedUnit = {
            ...selectedUnit,
            progress: packageResult.data.unit.progress,
            status: packageResult.data.unit.status || selectedUnit.status,
          };

          setDisplayUnits(
            displayUnits.map((u) => u.id === selectedUnit.id ? updatedUnit : u)
          );
        }

        // Refresh latest data từ API
        console.log("🔄 Starting refresh for unit:", selectedUnit.code);
        await refreshUnitData(selectedUnit.code);
        console.log("🔄 Refresh done");
      } else {
        const errorMsg = packageResult?.error || "Package scan failed";
        setScanResult({ success: false, message: `❌ ${errorMsg}` });
      }
    } catch (error) {
      console.error("❌ Package scan error:", error);
      setScanResult({ success: false, message: "❌ Package scan error" });
    } finally {
      setLoading(false);
    }
  };

  // Package All - scan package for all units
  const handlePackageAll = async () => {
    if (!displayUnits || displayUnits.length === 0) {
      setScanResult({ success: false, message: "❌ Không có units" });
      return;
    }

    setLoading(true);
    console.log("📦 Starting package all for", displayUnits.length, "units...");
    let packagedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < displayUnits.length; i++) {
      const unit = displayUnits[i];
      console.log(`\n🔄 [${i + 1}/${displayUnits.length}] Processing unit:`, unit.code);

      try {
        // Check current status
        const statusData = await fetchSubBarcodeInfo(unit.code, token, handleTokenRefresh);
        if (!statusData) {
          console.error(`❌ Unit ${i + 1}: Could not get status`);
          failedCount++;
          continue;
        }

        let currentUnit = unit;

        // Check & scan print if needed
        const printDone = statusData.progress?.some((p) => p.baseType === "print");
        if (!printDone) {
          const printStep = unit.workflow?.find((w) => w.baseType === "print");
          if (printStep) {
            console.log(`  ⏳ Scanning print...`);
            const printResult = await scanUnitPrint(unit.code, printStep.id, token, handleTokenRefresh);
            if (!printResult?.success) {
              console.error(`  ❌ Print failed`);
              failedCount++;
              continue;
            }
            if (printResult.data?.unit) {
              currentUnit = { ...currentUnit, progress: printResult.data.unit.progress };
            }
          }
        }

        // Check & scan cut if needed
        const cutDone = currentUnit.progress?.some((p) => p.baseType === "cut");
        if (!cutDone) {
          const cutStep = unit.workflow?.find((w) => w.baseType === "cut");
          if (cutStep) {
            console.log(`  ✂️ Scanning cut...`);
            const cutResult = await scanUnitCut(unit.code, cutStep.id, token, handleTokenRefresh);
            if (!cutResult?.success) {
              console.error(`  ❌ Cut failed`);
              failedCount++;
              continue;
            }
            if (cutResult.data?.unit) {
              currentUnit = { ...currentUnit, progress: cutResult.data.unit.progress };
            }
          }
        }

        // Check & scan QC if needed
        const qcDone = currentUnit.progress?.some((p) => p.baseType === "qc_pass");
        if (!qcDone) {
          const qcStep = unit.workflow?.find((w) => w.baseType === "qc_pass");
          if (qcStep) {
            console.log(`  ✔️ Scanning QC...`);
            const qcResult = await scanUnitQC(unit.code, qcStep.id, token, handleTokenRefresh);
            if (!qcResult?.success) {
              console.error(`  ❌ QC failed:`, qcResult?.error);
              failedCount++;
              continue;
            }
            if (qcResult.data?.unit) {
              currentUnit = { ...currentUnit, progress: qcResult.data.unit.progress };
            }
          }
        }

        // Scan package
        const packageStep = unit.workflow?.find((w) => w.baseType === "package");
        if (packageStep) {
          console.log(`  📦 Scanning package...`);
          const packageResult = await scanUnitPackage(unit.code, packageStep.id, token, handleTokenRefresh);
          if (!packageResult?.success) {
            console.error(`  ❌ Package failed:`, packageResult?.error);
            failedCount++;
            continue;
          }
          if (packageResult.data?.unit) {
            currentUnit = { ...currentUnit, progress: packageResult.data.unit.progress };
          }
        }

        // Update this unit
        setDisplayUnits(displayUnits.map((u) => u.id === unit.id ? currentUnit : u));
        await refreshUnitData(unit.code);

        console.log(`  ✅ Unit ${i + 1} packaged`);
        packagedCount++;
      } catch (error) {
        console.error(`❌ Unit ${i + 1} error:`, error);
        failedCount++;
      }
    }

    console.log(`\n📊 Package All done: ${packagedCount} packaged, ${failedCount} failed`);

    // Only show modal if there are failures
    if (failedCount > 0) {
      setScanResult({
        success: false,
        message: `⚠️ ${packagedCount}/${displayUnits.length} units packaged, ${failedCount} failed`,
      });
    }
    setLoading(false);
  };

  // Pass All - scan QC for all units
  const handlePassAll = async () => {
    if (!displayUnits || displayUnits.length === 0) {
      setScanResult({ success: false, message: "❌ Không có units" });
      return;
    }

    setLoading(true);
    console.log("📦 Starting pass all for", displayUnits.length, "units...");
    let passedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < displayUnits.length; i++) {
      const unit = displayUnits[i];
      console.log(`\n🔄 [${i + 1}/${displayUnits.length}] Processing unit:`, unit.code);

      try {
        // Check current status
        const statusData = await fetchSubBarcodeInfo(unit.code, token, handleTokenRefresh);
        if (!statusData) {
          console.error(`❌ Unit ${i + 1}: Could not get status`);
          failedCount++;
          continue;
        }

        let currentUnit = unit;

        // Check & scan print if needed
        const printDone = statusData.progress?.some((p) => p.baseType === "print");
        if (!printDone) {
          const printStep = unit.workflow?.find((w) => w.baseType === "print");
          if (printStep) {
            console.log(`  ⏳ Scanning print...`);
            const printResult = await scanUnitPrint(unit.code, printStep.id, token, handleTokenRefresh);
            if (!printResult?.success) {
              console.error(`  ❌ Print failed`);
              failedCount++;
              continue;
            }
            if (printResult.data?.unit) {
              currentUnit = { ...currentUnit, progress: printResult.data.unit.progress };
            }
          }
        }

        // Check & scan cut if needed
        const cutDone = currentUnit.progress?.some((p) => p.baseType === "cut");
        if (!cutDone) {
          const cutStep = unit.workflow?.find((w) => w.baseType === "cut");
          if (cutStep) {
            console.log(`  ✂️ Scanning cut...`);
            const cutResult = await scanUnitCut(unit.code, cutStep.id, token, handleTokenRefresh);
            if (!cutResult?.success) {
              console.error(`  ❌ Cut failed`);
              failedCount++;
              continue;
            }
            if (cutResult.data?.unit) {
              currentUnit = { ...currentUnit, progress: cutResult.data.unit.progress };
            }
          }
        }

        // Scan QC
        const qcStep = unit.workflow?.find((w) => w.baseType === "qc_pass");
        if (qcStep) {
          console.log(`  ✔️ Scanning QC...`);
          const qcResult = await scanUnitQC(unit.code, qcStep.id, token, handleTokenRefresh);
          if (!qcResult?.success) {
            console.error(`  ❌ QC failed:`, qcResult?.error);
            failedCount++;
            continue;
          }
          if (qcResult.data?.unit) {
            currentUnit = { ...currentUnit, progress: qcResult.data.unit.progress };
          }
        }

        // Update this unit
        setDisplayUnits(displayUnits.map((u) => u.id === unit.id ? currentUnit : u));
        await refreshUnitData(unit.code);

        console.log(`  ✅ Unit ${i + 1} passed`);
        passedCount++;
      } catch (error) {
        console.error(`❌ Unit ${i + 1} error:`, error);
        failedCount++;
      }
    }

    console.log(`\n📊 Pass All done: ${passedCount} passed, ${failedCount} failed`);

    // Only show modal if there are failures
    if (failedCount > 0) {
      setScanResult({
        success: false,
        message: `⚠️ ${passedCount}/${displayUnits.length} units passed, ${failedCount} failed`,
      });
    }
    setLoading(false);
  };

  // Scan QC Pass - check cut first, then scan QC
  const handleScanQC = async () => {
    let selectedUnit = displayUnits.find((u) => u.code === originalBarcode);

    if (!selectedUnit) {
      setScanResult({ success: false, message: "❌ Chọn unit trước" });
      return;
    }

    setLoading(true);
    try {
      // Check current status
      console.log("🔍 Checking status for QC scan:", selectedUnit.code);
      const statusData = await fetchSubBarcodeInfo(selectedUnit.code, token, handleTokenRefresh);

      if (!statusData) {
        setScanResult({ success: false, message: "❌ Không lấy được trạng thái" });
        return;
      }

      // Check if cut step is completed
      const cutStepCompleted = statusData.progress?.some((p) => p.baseType === "cut");

      if (!cutStepCompleted) {
        console.log("⏳ Cut not done, triggering cut scan (which checks print first)...");

        // Call handleScanCut which already has print-check logic inside
        // But we need to handle differently since we're calling from QC context
        // Check print first
        const printStepCompleted = statusData.progress?.some((p) => p.baseType === "print");

        if (!printStepCompleted) {
          console.log("⏳ Print also not done, auto scanning print first...");
          const printStep = selectedUnit.workflow?.find((w) => w.baseType === "print");
          if (!printStep) {
            setScanResult({ success: false, message: "❌ Không có bước Print" });
            return;
          }

          const printResult = await scanUnitPrint(selectedUnit.code, printStep.id, token, handleTokenRefresh);
          if (!printResult?.success) {
            setScanResult({ success: false, message: `❌ In thất bại: ${printResult?.error}` });
            return;
          }

          if (printResult.data?.unit) {
            selectedUnit = {
              ...selectedUnit,
              progress: printResult.data.unit.progress,
              status: printResult.data.unit.status || selectedUnit.status,
            };
            setDisplayUnits(displayUnits.map((u) => u.id === selectedUnit.id ? selectedUnit : u));
          }
          console.log("✅ Auto print done");
        }

        // Now scan cut
        const cutStep = selectedUnit.workflow?.find((w) => w.baseType === "cut");
        if (!cutStep) {
          setScanResult({ success: false, message: "❌ Không có bước Cut" });
          return;
        }

        const cutResult = await scanUnitCut(selectedUnit.code, cutStep.id, token, handleTokenRefresh);

        if (!cutResult?.success) {
          const errorMsg = cutResult?.error || "Scan failed";
          setScanResult({ success: false, message: `❌ Cut thất bại: ${errorMsg}` });
          return;
        }

        if (cutResult.data?.unit) {
          selectedUnit = {
            ...selectedUnit,
            progress: cutResult.data.unit.progress,
            status: cutResult.data.unit.status || selectedUnit.status,
          };
          setDisplayUnits(displayUnits.map((u) => u.id === selectedUnit.id ? selectedUnit : u));
        }
        console.log("✅ Auto cut done, scanning QC...");
      }

      // Get QC step ID
      const qcStep = selectedUnit.workflow?.find((w) => w.baseType === "qc_pass");
      if (!qcStep) {
        setScanResult({ success: false, message: "❌ Không có bước QC" });
        return;
      }

      console.log("✔️ Scanning QC pass for unit:", selectedUnit.code);
      const qcResult = await scanUnitQC(selectedUnit.code, qcStep.id, token, handleTokenRefresh);

      if (qcResult?.success) {
        console.log("✅ Scan QC success:", selectedUnit.code, qcResult);

        if (qcResult.data?.unit) {
          const updatedUnit = {
            ...selectedUnit,
            progress: qcResult.data.unit.progress,
            status: qcResult.data.unit.status || selectedUnit.status,
          };

          setDisplayUnits(
            displayUnits.map((u) => u.id === selectedUnit.id ? updatedUnit : u)
          );
        }

        // Refresh latest data từ API
        console.log("🔄 Starting refresh for unit:", selectedUnit.code);
        await refreshUnitData(selectedUnit.code);
        console.log("🔄 Refresh done");
      } else {
        const errorMsg = qcResult?.error || "QC scan failed";
        setScanResult({ success: false, message: `❌ ${errorMsg}` });
      }
    } catch (error) {
      console.error("❌ QC scan error:", error);
      setScanResult({ success: false, message: "❌ QC scan error" });
    } finally {
      setLoading(false);
    }
  };

  // Scan cut button - check status, auto scan print if needed
  const handleScanCut = async () => {
    let selectedUnit = displayUnits.find((u) => u.code === originalBarcode);

    if (!selectedUnit) {
      setScanResult({ success: false, message: "❌ Chọn unit trước" });
      return;
    }

    setLoading(true);
    try {
      // Check current status using fetchSubBarcodeInfo
      console.log("🔍 Checking status for unit:", selectedUnit.code);
      const statusData = await fetchSubBarcodeInfo(selectedUnit.code, token, handleTokenRefresh);

      if (!statusData) {
        setScanResult({ success: false, message: "❌ Không lấy được trạng thái" });
        return;
      }

      // Check if print step is completed
      const printStepCompleted = statusData.progress?.some((p) => p.baseType === "print");

      if (!printStepCompleted) {
        console.log("⏳ Print not done, auto scanning print first...");

        const printStep = selectedUnit.workflow?.find((w) => w.baseType === "print");
        if (!printStep) {
          setScanResult({ success: false, message: "❌ Không có bước Print" });
          return;
        }

        const printResult = await scanUnitPrint(selectedUnit.code, printStep.id, token, handleTokenRefresh);

        if (!printResult?.success) {
          const errorMsg = printResult?.error || "Scan failed";
          setScanResult({ success: false, message: `❌ In thất bại: ${errorMsg}` });
          return;
        }

        if (printResult.data?.unit) {
          selectedUnit = {
            ...selectedUnit,
            progress: printResult.data.unit.progress,
            status: printResult.data.unit.status || selectedUnit.status,
          };
          setDisplayUnits(displayUnits.map((u) => u.id === selectedUnit.id ? selectedUnit : u));
        }
        console.log("✅ Auto print done, scanning cut...");
      }

      // Get cut step ID
      const cutStep = selectedUnit.workflow?.find((w) => w.baseType === "cut");
      if (!cutStep) {
        setScanResult({ success: false, message: "❌ Không có bước Cut" });
        return;
      }

      console.log("✂️ Scanning cut for unit:", selectedUnit.code);
      const cutResult = await scanUnitCut(selectedUnit.code, cutStep.id, token, handleTokenRefresh);

      if (cutResult?.success) {
        console.log("✅ Scan cut success:", selectedUnit.code, cutResult);

        if (cutResult.data?.unit) {
          const updatedUnit = {
            ...selectedUnit,
            progress: cutResult.data.unit.progress,
            status: cutResult.data.unit.status || selectedUnit.status,
          };

          setDisplayUnits(
            displayUnits.map((u) => u.id === selectedUnit.id ? updatedUnit : u)
          );
        }

        // Refresh latest data từ API
        console.log("🔄 Starting refresh for unit:", selectedUnit.code);
        await refreshUnitData(selectedUnit.code);
        console.log("🔄 Refresh done");
      } else {
        const errorMsg = cutResult?.error || "Scan failed";
        setScanResult({ success: false, message: `❌ ${errorMsg}` });
      }
    } catch (error) {
      console.error("❌ Scan cut error:", error);
      setScanResult({ success: false, message: "❌ Scan error" });
    } finally {
      setLoading(false);
    }
  };

  // Scan print button - scan selected unit
  const handleScanPrint = async () => {
    // Find selected unit (có viền đỏ)
    const selectedUnit = displayUnits.find((u) => u.code === originalBarcode);

    if (!selectedUnit) {
      alert("Vui lòng chọn unit trước");
      return;
    }

    // Get print step ID from workflow
    const printStep = selectedUnit.workflow?.find((w) => w.baseType === "print");
    if (!printStep) {
      console.error("Workflow:", selectedUnit.workflow);
      alert("Không tìm thấy bước Print trong workflow");
      return;
    }

    setLoading(true);
    try {
      console.log("📸 Scanning print for unit:", selectedUnit.code);

      // Call scan print function
      const result = await scanUnitPrint(selectedUnit.code, printStep.id, token, handleTokenRefresh);

      if (result?.success) {
        console.log("✅ Scan success:", selectedUnit.code, result);

        // Update unit state từ scan response
        if (result.data?.unit) {
          const updatedUnit = {
            ...selectedUnit,
            progress: result.data.unit.progress,
            status: result.data.unit.status || selectedUnit.status,
          };

          setDisplayUnits(
            displayUnits.map((u) => u.id === selectedUnit.id ? updatedUnit : u)
          );
        }

        // Refresh latest data từ API
        console.log("🔄 Starting refresh for unit:", selectedUnit.code);
        await refreshUnitData(selectedUnit.code);
        console.log("🔄 Refresh done");
      } else {
        const errorMsg = result?.error || "Scan failed";
        console.error("❌ Scan failed:", errorMsg, `(${result?.status})`);
        setScanResult({ success: false, message: `❌ ${errorMsg}` });
      }
    } catch (error) {
      console.error("❌ Scan error:", error);
      setScanResult({ success: false, message: "❌ Scan error" });
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeKeyDown = async (e) => {
    if (e.key === "Enter") {
      // If modal showing, don't consume Enter - let global handler close it
      if (scanResult) {
        return;
      }

      if (barcode.trim()) {
        setLoading(true);
        try {
          console.log("🔍 Scanning barcode:", barcode);
          // Fetch sub-barcode info với token refresh callback
          const barcodeData = await fetchSubBarcodeInfo(barcode, token, handleTokenRefresh);
          console.log("📦 Barcode data result:", barcodeData);

          if (barcodeData) {
            setOriginalBarcode(barcode);
            const pwOrderId = barcodeData.pwOrderId;

            // Fetch order with items list
            let orderData = null;
            let allUnits = [];

            if (pwOrderId) {
              orderData = await fetchOrder(pwOrderId, token, handleTokenRefresh);

              // Extract vendorCount (always set, even if 0)
              const vc = orderData?.vendorCount || 0;
              console.log("📊 vendorCount:", vc);
              setVendorCount(vc);

              // Fetch units for each item in the order
              if (orderData?.items && orderData.items.length > 0) {
                const unitsPromises = orderData.items.map((item) =>
                  fetchSubBarcodes(item.id, token, handleTokenRefresh)
                    .then((data) => {
                      // Keep units with their item's workflow & orderItemId attached
                      const units = data?.units || [];
                      return units.map((unit) => ({
                        ...unit,
                        workflow: data?.item?.workflow || [],
                        orderItemId: data?.item?.id,
                      }));
                    })
                    .catch(() => [])
                );
                const itemUnitArrays = await Promise.all(unitsPromises);
                allUnits = itemUnitArrays.flat();

                // Fetch details (designUrls, productName, sku) for each unit
                const unitDetailsPromises = allUnits.map((unit) =>
                  fetchSubBarcodeInfo(unit.code, token, handleTokenRefresh)
                    .then((details) => ({
                      ...unit,
                      details: details || {},
                    }))
                    .catch(() => ({
                      ...unit,
                      details: {},
                    }))
                );
                allUnits = await Promise.all(unitDetailsPromises);
              }
            }

            setScannedList([...scannedList, {
              barcode,
              timestamp: new Date().toLocaleTimeString(),
              productName: barcodeData.productName || "N/A",
              sku: barcodeData.sku || "N/A",
              status: barcodeData.status || "N/A",
              orderId: pwOrderId || "N/A",
              orderName: orderData?.order?.orderName || "N/A",
              orderStatus: orderData?.order?.status || "N/A",
              orderType: orderData?.order?.orderType || "N/A",
              totalItems: orderData?.items?.length || 0,
              units: allUnits,
            }]);

            // Display all units from all items
            setDisplayUnits(allUnits);
            // Auto-select first unit
            if (allUnits.length > 0) {
              setOriginalBarcode(allUnits[0].code);
            }
          } else {
            console.error("No barcode data found");
          }
        } catch (error) {
          console.error("Barcode scan error:", error);
        } finally {
          setLoading(false);
        }
        setBarcode(""); // Clear input
        e.preventDefault();
      }
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "lab(29 0 0)" }}>
      {/* Loading Spinner Overlay */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
          <div className="w-20 h-20 border-8 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}

      <div className="w-full">
        {/* <h1 className="text-4xl font-bold mb-2">{DONGGOI_TITLE}</h1> */}


        {isAuthenticated ? (
          <div>
            {/* Top Section: Input & Buttons */}
            <div className="flex gap-6 mb-8">
              {/* Left: Barcode Input (1/3) */}
              <div className="w-1/3">
                <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    📱 Quét mã vạch
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={barcode}
                    onChange={handleBarcodeChange}
                    onKeyDown={handleBarcodeKeyDown}
                    placeholder="Quét mã vạch hoặc nhập và ấn Enter"
                    className="w-full px-4 py-3 text-lg border-2 border-blue-500 rounded-lg focus:outline-none focus:border-blue-600 dark:bg-zinc-800 dark:text-white dark:border-blue-400"
                    autoFocus
                  />
                </div>
              </div>

              {/* Right: Buttons (2/3) */}
              <div className="w-2/3 flex flex-row gap-2">
                <button
                  onClick={handleScanPrint}
                  className="flex-1 h-24 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg p-2 transition"
                >
                  Quét In
                </button>
                <button
                  onClick={handleScanCut}
                  className="flex-1 h-24 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg p-2 transition"
                >
                  Quét Cut
                </button>
                <button
                  onClick={handleScanQC}
                  className="flex-1 h-24 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg p-2 transition"
                >
                  QC Pass
                </button>
                <button
                  onClick={handlePassAll}
                  className="flex-1 h-24 text-white font-semibold rounded-lg p-2 transition hover:opacity-80"
                  style={{ backgroundColor: "lab(36 72.92 -88.87)" }}
                >
                  Pass All
                </button>
                <button
                  onClick={handlePackage}
                  className="flex-1 h-24 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg p-2 transition"
                >
                  Package
                </button>

                <button
                  onClick={handlePackageAll}
                  className="flex-1 h-24 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-lg p-2 transition"
                >
                  Package All
                </button>

              </div>

            </div>

            {/* Scan Result Dialog */}
            {scanResult && (
              <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="absolute inset-0 bg-black/50"></div>
                <div className={`relative px-12 py-16 rounded-2xl text-white font-bold text-center ${scanResult.success
                    ? "bg-green-500"
                    : "bg-red-500"
                  }`}>
                  <p className="text-5xl">{scanResult.message}</p>
                </div>
              </div>
            )}

            {/* Display Units Grid + Large Image */}
            <div className="flex gap-4 flex-1 min-h-0">
              {/* Left: Card list (1/4) */}
              <div className="w-1/4">
                <UnitsGrid units={displayUnits} scannedBarcode={originalBarcode} onSelectUnit={setOriginalBarcode} vendorCount={vendorCount} />
              </div>

              {/* Right: Large image (3/4) */}
              <div className="w-3/4 h-full">
                <ImageViewer
                  imageSrc={originalBarcode && displayUnits.find(u => u.code === originalBarcode)?.details?.designUrls?.[0] || null}
                  alt="Selected unit"
                  cards={displayUnits}
                  currentCardCode={originalBarcode}
                  onCardChange={setOriginalBarcode}
                  onExitZoomMode={() => setBarcode("")}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-100">
              ✗ Chưa xác thực
            </h2>
            <p className="text-red-800 dark:text-red-300 mt-2">
              Vui lòng kiểm tra credentials
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
