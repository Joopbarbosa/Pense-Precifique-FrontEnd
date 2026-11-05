import clsx from "clsx";
import { Check } from "lucide-react";
import { STATUS_LABEL } from "../../../constants";
import { STEPS, type ApiStatus } from "./statusDetalhe";
import { formatarDataHora } from "../../../utils/data";

export default function Timeline({ current, datas = {} }: { current: ApiStatus; datas?: Partial<Record<ApiStatus, string | null | undefined>> }) {
  const ci = STEPS.indexOf(current);
  return (
    <div className="flex items-start max-[680px]:flex-col max-[680px]:items-stretch">
      {STEPS.map((s, i) => {
        const done = ci >= 0 && i < ci;
        const active = i === ci;
        const circleBg = active
          ? "#2A9D8F"
          : done
            ? "rgba(42,157,143,0.16)"
            : "#F1F0EC";
        const circleColor = active ? "#fff" : done ? "#2A9D8F" : "#B7B4AD";
        const connColor = ci >= 0 && i <= ci ? "rgba(42,157,143,0.5)" : "#EFEDE8";

        return (
          <div
            className="relative flex flex-1 flex-col items-center text-center max-[680px]:flex-row max-[680px]:items-start max-[680px]:gap-3.5 max-[680px]:pb-2 max-[680px]:text-left"
            key={s}
          >
            {i > 0 && (
              <span
                className="absolute left-[-50%] right-[50%] top-[17px] z-0 h-[2.5px] max-[680px]:left-[17px] max-[680px]:right-auto max-[680px]:top-[-50%] max-[680px]:h-auto max-[680px]:w-[2.5px] max-[680px]:bottom-1/2"
                style={{ background: connColor }}
              />
            )}
            <span
              className="relative z-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold"
              style={{
                background: circleBg,
                color: circleColor,
                border: active ? "2px solid #2A9D8F" : "2px solid transparent",
                boxShadow: active ? "0 0 0 5px rgba(42,157,143,0.14)" : "none",
              }}
            >
              {done ? (
                <Check size={14} />
              ) : active ? (
                <span className="h-[9px] w-[9px] rounded-full bg-white" />
              ) : (
                i + 1
              )}
            </span>
            <span className="mt-2.5 max-[680px]:pb-3.5 max-[680px]:pt-1.5">
              <span
                className={clsx(
                  "block whitespace-nowrap text-[12.5px]",
                  active ? "font-bold text-dark" : done ? "font-medium text-dim" : "font-medium text-faint"
                )}
              >
                {STATUS_LABEL[s]}
              </span>
              {(done || active) && datas[s] && (
                <span className="mt-0.5 block whitespace-nowrap text-[11px] text-muted" data-testid={`data-passo-${s}`}>
                  {formatarDataHora(datas[s])}
                </span>
              )}
              {active && (
                <span className="mt-[5px] inline-block rounded-full bg-teal/12 px-2 py-0.5 text-[10.5px] font-semibold text-teal">
                  Atual
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
