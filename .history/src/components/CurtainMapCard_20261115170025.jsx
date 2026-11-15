
    
  

            <span className="text-rose-400">{minFrp} MW</span>

          </div>

          <input

            type="range"

            min="0"

            max="2000"

            step="50"

            value={minFrp}

            onChange={(e) => setMinFrp(Number(e.target.value))}

            className="w-full accent-rose-400"

          />

        </div>



        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-center gap-1.5">

          <label className="flex items-center justify-between cursor-pointer">

            <span className="flex items-center gap-1.5 text-slate-300">

              <Eye className="w-3.5 h-3.5 text-sky-400" /> Dual-Sensor Only

            </span>

            <input

              type="checkbox"

              checked={onlyDual}

              onChange={(e) => setOnlyDual(e.target.checked)}

              className="accent-sky-400"

            />

          </label>

          <label className="flex items-center justify-between cursor-pointer">

            <span className="flex items-center gap-1.5 text-slate-300">

              <Flame className="w-3.5 h-3.5 text-amber-400" /> Thermal Glow

            </span>

            <input

              type="checkbox"

              checked={showHeatmap}

              onChange={(e) => setShowHeatmap(e.target.checked)}

              className="accent-amber-400"

            />

          </label>

        </div>



        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-center">

          <button

            onClick={() => {

              setScanActive(!scanActive)

              if (scanActive) {

                if (radarCircleRef.current) radarCircleRef.current.setMap(null)

                setScanResult(null)

              }

            }}

            className={`w-full py-2 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition ${

              scanActive ? 'astro-pill-btn' : 'bg-rose-500/20 border border-rose-400/40 text-rose-200'

            }`}

          >

            <Crosshair className="w-3.5 h-3.5" />

            <span>{scanActive ? 'Click on Map...' : '200 km Radar Scan'}</span>

          </button>

          {scanResult && (

            <div className="font-mono text-[10px] text-sky-300 mt-1.5 text-center">

              {scanResult.count} fires • {scanResult.dual} dual • {scanResult.peak} MW

            </div>

          )}

        </div>

      </div>

    </div>

  )

}