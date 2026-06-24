import { baseApi } from '../../app/api';
import type { Certificate } from '../../types';

export const certificatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    myCertificates: builder.query<Certificate[], void>({
      query: () => ({ url: '/results/certificates/me', method: 'GET' }),
      providesTags: ['Certificate'],
    }),
    issueCertificate: builder.mutation<Certificate, string>({
      query: (resultId) => ({ url: `/results/certificates/${resultId}`, method: 'POST' }),
      invalidatesTags: ['Certificate'],
    }),
    verifyCertificate: builder.query<{ valid: boolean; certificate?: Certificate }, string>({
      query: (certificateId) => ({ url: `/results/certificates/verify/${certificateId}`, method: 'GET' }),
    }),
  }),
});

export const { useMyCertificatesQuery, useIssueCertificateMutation, useVerifyCertificateQuery } = certificatesApi;
