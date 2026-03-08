import { getPanelUrl, versaFetch } from '@/dashboard/js/functions';
import type { VersaParamsFetch } from '@/dashboard/types/versaTypes.d';

const panelUrl = getPanelUrl();
export const fetchGetEmpresas = async (): Promise<any> => {
    const params: VersaParamsFetch = {
        url: `/${panelUrl}/empresas/api/list?per_page=100000&externaFilter="estado = 1"`,
        method: 'GET',
        headers: {
            'content-type': 'application/json',
        },
    };
    const response = await versaFetch(params);
    return response;
};

export const fetchGetAdicionalesFactura = async (empresaId: number): Promise<any> => {
    const params: VersaParamsFetch = {
        url: `/${panelUrl}/empresas/api/getAdicionalesEmpresa?empresa_id=${empresaId}`,
        method: 'GET',
        headers: {
            'content-type': 'application/json',
        },
    };
    const response = await versaFetch(params);
    return response;
};
